import { db, schema } from '../db/index.js';
import { eq, and, asc, or, isNull, inArray } from 'drizzle-orm';
import { auditService } from './AuditService.js';

/**
 * Service for managing queue operations.
 * 
 * Handles:
 * - Queue position calculation
 * - Wait time estimation (using actual per-ticket service durations)
 * - Position recalculation after status changes
 * - Queue metrics
 * 
 * General line: tickets with no preferred barber, or whose preferred barber is inactive.
 * When a barber goes inactive, their preferred customers count in the general line;
 * when the barber goes active again, those customers go back to that barber's line.
 */
export class QueueService {
  /**
   * Returns IDs of barbers that are active (available for queue) in the shop.
   */
  private async getActiveBarberIds(shopId: number): Promise<Set<number>> {
    const barbers = await db.query.barbers.findMany({
      where: and(
        eq(schema.barbers.shopId, shopId),
        eq(schema.barbers.isActive, true)
      ),
    });
    return new Set(barbers.map((b) => b.id));
  }

  /**
   * Returns waiting tickets that are in the "general line": no preferred barber,
   * or preferred barber is inactive. Ordered by createdAt.
   */
  private async getGeneralLineWaitingTickets(shopId: number) {
    const activeBarberIds = await this.getActiveBarberIds(shopId);
    const waitingTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting')
      ),
      orderBy: [asc(schema.tickets.createdAt)],
    });
    return waitingTickets.filter(
      (t) => t.preferredBarberId === null || !activeBarberIds.has(t.preferredBarberId!)
    );
  }

  /**
   * Pre-load service durations for a set of service IDs.
   * Returns a Map<serviceId, durationMinutes> for O(1) lookups.
   */
  private async loadServiceDurations(serviceIds: Set<number>): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (serviceIds.size === 0) return map;

    const services = await db.query.services.findMany({
      where: inArray(schema.services.id, [...serviceIds]),
    });
    for (const s of services) map.set(s.id, s.duration);
    return map;
  }

  /**
   * Pre-load per-barber weekday stats for today's day of the week.
   * Returns a Map keyed by "barberId:serviceId" -> avgDuration for stats with
   * totalCompleted >= 10. If fewer than 10, the entry is omitted so callers
   * fall back to the standard service duration.
   */
  private async loadBarberWeekdayStats(
    barberIds: number[],
    serviceIds: number[]
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (barberIds.length === 0 || serviceIds.length === 0) return map;

    const todayDow = new Date().getDay(); // 0=Sunday .. 6=Saturday

    const stats = await db.query.barberServiceWeekdayStats.findMany({
      where: and(
        eq(schema.barberServiceWeekdayStats.dayOfWeek, todayDow),
        inArray(schema.barberServiceWeekdayStats.barberId, barberIds),
        inArray(schema.barberServiceWeekdayStats.serviceId, serviceIds),
      ),
    });

    for (const s of stats) {
      if (s.totalCompleted >= 10) {
        map.set(`${s.barberId}:${s.serviceId}`, s.avgDuration);
      }
    }

    return map;
  }

  /**
   * Calculate queue position in the general line.
   * Only counts tickets in the general line (no preferred barber or preferred barber inactive).
   * 
   * @param shopId - Shop database ID
   * @param createdAt - Ticket creation timestamp (for ordering)
   * @returns The position in queue (1-based index, 0 means not in active queue)
   */
  async calculatePosition(
    shopId: number,
    createdAt: Date = new Date()
  ): Promise<number> {
    const generalLineTickets = await this.getGeneralLineWaitingTickets(shopId);
    const ticketsAhead = generalLineTickets.filter(
      (ticket) => new Date(ticket.createdAt) < createdAt
    );
    return ticketsAhead.length + 1;
  }

  /**
   * Calculate estimated wait time using wave-based simulation with actual
   * per-ticket service durations.
   * 
   * Algorithm:
   * 1. Build per-barber availability (remaining time on current service)
   * 2. For each ticket ahead in the general line, assign it to the
   *    earliest-available barber and add that ticket's service duration
   * 3. Result = time until the first barber becomes free
   * 
   * @param shopId - Shop database ID
   * @param position - Position in queue (1-based)
   * @returns Estimated wait time in minutes (null if position is 0)
   */
  async calculateWaitTime(
    shopId: number,
    position: number
  ): Promise<number | null> {
    if (position === 0) return null;

    const now = new Date();

    // Get all active & present barbers
    const activeBarbers = await db.query.barbers.findMany({
      where: and(
        eq(schema.barbers.shopId, shopId),
        eq(schema.barbers.isActive, true),
        eq(schema.barbers.isPresent, true)
      ),
    });

    // Get all in-progress tickets to find which barbers are busy
    const inProgressTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'in_progress')
      ),
    });
    const inProgressWithBarbers = inProgressTickets.filter(t => t.barberId !== null);

    // Waiting tickets ahead of this position (general line only)
    const generalLineTickets = await this.getGeneralLineWaitingTickets(shopId);
    const ticketsAhead = generalLineTickets.slice(0, Math.max(position - 1, 0));

    // Pre-load all service durations in one query
    const serviceIds = new Set<number>();
    for (const t of inProgressWithBarbers) serviceIds.add(t.serviceId);
    for (const t of ticketsAhead) serviceIds.add(t.serviceId);
    const durations = await this.loadServiceDurations(serviceIds);

    // Pre-load barber weekday stats for barber-aware duration lookups
    const barberIds = activeBarbers.map((b) => b.id);
    const barberStats = await this.loadBarberWeekdayStats(barberIds, [...serviceIds]);

    // Resolve duration: use barber-specific avg if >= 10 completions, else service default
    const getDuration = (serviceId: number, barberId?: number) => {
      if (barberId) {
        const avg = barberStats.get(`${barberId}:${serviceId}`);
        if (avg !== undefined) return avg;
      }
      return durations.get(serviceId) ?? 20;
    };

    // Build barber availability: minutes until each barber is free.
    // Uses startedAt (when service began) for elapsed time calculation.
    const barberAvailability: number[] = [];
    for (const barber of activeBarbers) {
      const inProgress = inProgressWithBarbers.find(t => t.barberId === barber.id);
      if (inProgress) {
        const startTime = inProgress.startedAt
          ? new Date(inProgress.startedAt)
          : inProgress.updatedAt ? new Date(inProgress.updatedAt) : now;
        const elapsedMinutes = Math.max(0, (now.getTime() - startTime.getTime()) / 60000);
        const serviceDuration = getDuration(inProgress.serviceId, barber.id);
        barberAvailability.push(Math.max(0, serviceDuration - elapsedMinutes));
      } else {
        barberAvailability.push(0);
      }
    }

    // Fallback: if no active barbers, assume 1 virtual barber available now
    if (barberAvailability.length === 0) {
      barberAvailability.push(0);
    }

    // Simulate queue processing: assign each ticket ahead to the
    // earliest-available barber, adding that ticket's actual service duration.
    // This models "waves" correctly — e.g. 4 barbers clear 4 people per wave.
    for (const ticket of ticketsAhead) {
      const minTime = Math.min(...barberAvailability);
      const minIdx = barberAvailability.indexOf(minTime);
      const barberId = activeBarbers[minIdx]?.id;
      barberAvailability[minIdx] += getDuration(ticket.serviceId, barberId);
    }

    // Wait time = when the first barber becomes free after all people ahead
    return Math.ceil(Math.min(...barberAvailability));
  }

  /**
   * Recalculate positions for all waiting tickets in a shop.
   * Should be called after any ticket status change.
   * 
   * @param shopId - Shop database ID
   * @returns Number of tickets that were updated
   * 
   * @example
   * ```typescript
   * await queueService.recalculatePositions(1);
   * // All waiting tickets now have correct sequential positions
   * ```
   */
  async recalculatePositions(shopId: number): Promise<number> {
    // Get all waiting tickets ordered by creation time
    const waitingTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting')
      ),
      orderBy: [asc(schema.tickets.createdAt)],
    });

    // Update each ticket's position sequentially
    let updateCount = 0;
    for (let i = 0; i < waitingTickets.length; i++) {
      const newPosition = i + 1;
      
      // Only update if position changed
      if (waitingTickets[i].position !== newPosition) {
        const oldPosition = waitingTickets[i].position;
        
        await db
          .update(schema.tickets)
          .set({ 
            position: newPosition,
            updatedAt: new Date(),
          })
          .where(eq(schema.tickets.id, waitingTickets[i].id));
        
        // Log position update
        auditService.logPositionUpdated(waitingTickets[i].id, shopId, oldPosition, newPosition);
        
        updateCount++;
      }
    }

    // Set position to 0 for non-waiting tickets
    await db
      .update(schema.tickets)
      .set({ position: 0 })
      .where(
        and(
          eq(schema.tickets.shopId, shopId),
          eq(schema.tickets.status, 'in_progress')
        )
      );

    return updateCount;
  }

  /**
   * Get queue metrics for a shop.
   * 
   * @param shopId - Shop database ID
   * @returns Queue metrics (length, average wait time, active barbers)
   * 
   * @example
   * ```typescript
   * const metrics = await queueService.getMetrics(1);
   * // Returns: { queueLength: 5, averageWaitTime: 35, activeBarbers: 2 }
   * ```
   */
  async getMetrics(shopId: number): Promise<{
    queueLength: number;
    averageWaitTime: number;
    activeBarbers: number;
    ticketsInProgress: number;
  }> {
    // General line only (no preferred barber or preferred barber inactive)
    const generalLineTickets = await this.getGeneralLineWaitingTickets(shopId);
    const totalWaitTime = generalLineTickets.reduce(
      (sum, t) => sum + (t.estimatedWaitTime ?? 0),
      0
    );
    const averageWaitTime = generalLineTickets.length > 0
      ? Math.ceil(totalWaitTime / generalLineTickets.length)
      : 0;

    const inProgressTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'in_progress')
      ),
    });

    const activeBarbers = await db.query.barbers.findMany({
      where: and(
        eq(schema.barbers.shopId, shopId),
        eq(schema.barbers.isActive, true),
        eq(schema.barbers.isPresent, true)
      ),
    });

    return {
      queueLength: generalLineTickets.length,
      averageWaitTime,
      activeBarbers: activeBarbers.length,
      ticketsInProgress: inProgressTickets.length,
    };
  }

  /**
   * Check if a shop's queue is full.
   * 
   * @param shopId - Shop database ID
   * @param maxQueueSize - Maximum allowed queue size (default: 50)
   * @returns True if queue is at or above max size
   */
  async isQueueFull(
    shopId: number,
    maxQueueSize: number = 80
  ): Promise<boolean> {
    const { queueLength } = await this.getMetrics(shopId);
    return queueLength >= maxQueueSize;
  }

  /**
   * Calculate queue position for a ticket with a preferred barber.
   * Position is based on ALL tickets ahead that the preferred barber must serve:
   * - ALL general queue tickets (no preferredBarberId) - preferred barber cycles through these first
   * - Other tickets with the same preferredBarberId created before this ticket
   * 
   * @param shopId - Shop database ID
   * @param preferredBarberId - Preferred barber ID
   * @param createdAt - Ticket creation timestamp (for ordering)
   * @returns The position in queue (1-based index)
   * 
   * @example
   * ```typescript
   * const position = await queueService.calculatePositionForPreferredBarber(1, 3, new Date());
   * // Returns: 8 (eighth in that barber's queue)
   * ```
   */
  async calculatePositionForPreferredBarber(
    shopId: number,
    preferredBarberId: number,
    createdAt: Date = new Date()
  ): Promise<number> {
    // Get waiting tickets with the same preferred barber only
    // General queue tickets can be taken by any barber, so we don't count them for position
    const waitingTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting'),
        eq(schema.tickets.preferredBarberId, preferredBarberId) // Only same preferred barber
      ),
      orderBy: [asc(schema.tickets.createdAt)],
    });

    // Filter tickets created before the given time
    const ticketsAhead = waitingTickets.filter(
      ticket => new Date(ticket.createdAt) < createdAt
    );

    // Position is number of tickets ahead + 1
    return ticketsAhead.length + 1;
  }

  /**
   * Calculate estimated wait time for a ticket with a preferred barber.
   * Uses barberCount = 1 (only that one barber is available).
   * Counts ALL tickets ahead that the preferred barber must serve:
   * - ALL general queue tickets (no preference) - preferred barber serves these first
   * - Other tickets with same preferredBarberId ahead in queue
   * 
   * @param shopId - Shop database ID
   * @param preferredBarberId - Preferred barber ID
   * @param position - Position in queue (1-based)
   * @param createdAt - Ticket creation timestamp (for filtering tickets ahead)
   * @returns Estimated wait time in minutes (null if position is 0)
   * 
   * @example
   * ```typescript
   * const waitTime = await queueService.calculateWaitTimeForPreferredBarber(1, 3, 5, new Date());
   * // Returns: 100 (approximately 100 minutes)
   * ```
   */
  async calculateWaitTimeForPreferredBarber(
    shopId: number,
    preferredBarberId: number,
    position: number,
    createdAt: Date = new Date()
  ): Promise<number | null> {
    if (position === 0) return null;

    const now = new Date();

    // Get waiting tickets that are ahead for this preferred barber
    const waitingTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting'),
        eq(schema.tickets.preferredBarberId, preferredBarberId)
      ),
      orderBy: [asc(schema.tickets.createdAt)],
    });
    const ticketsAhead = waitingTickets.filter(
      ticket => new Date(ticket.createdAt) < createdAt
    );

    // Check if the preferred barber is currently serving someone
    const inProgressTicket = await db.query.tickets.findFirst({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'in_progress'),
        eq(schema.tickets.barberId, preferredBarberId)
      ),
    });

    // Pre-load service durations
    const serviceIds = new Set<number>();
    for (const t of ticketsAhead) serviceIds.add(t.serviceId);
    if (inProgressTicket) serviceIds.add(inProgressTicket.serviceId);
    const durations = await this.loadServiceDurations(serviceIds);

    // Pre-load barber weekday stats for the preferred barber
    const barberStats = await this.loadBarberWeekdayStats(
      [preferredBarberId],
      [...serviceIds]
    );

    // Resolve duration: use barber-specific avg if >= 10 completions, else service default
    const getDuration = (serviceId: number) => {
      const avg = barberStats.get(`${preferredBarberId}:${serviceId}`);
      if (avg !== undefined) return avg;
      return durations.get(serviceId) ?? 20;
    };

    // Single barber availability: remaining time if busy, 0 if idle
    let barberAvailability = 0;
    if (inProgressTicket) {
      const startTime = inProgressTicket.startedAt
        ? new Date(inProgressTicket.startedAt)
        : inProgressTicket.updatedAt ? new Date(inProgressTicket.updatedAt) : now;
      const elapsedMinutes = Math.max(0, (now.getTime() - startTime.getTime()) / 60000);
      const serviceDuration = getDuration(inProgressTicket.serviceId);
      barberAvailability = Math.max(0, serviceDuration - elapsedMinutes);
    }

    // Simulate: each ticket ahead adds its actual service duration
    let totalWait = barberAvailability;
    for (const ticket of ticketsAhead) {
      totalWait += getDuration(ticket.serviceId);
    }
    return Math.ceil(totalWait);
  }
}

/**
 * Singleton instance of QueueService.
 * Use this exported instance throughout the application.
 * 
 * @example
 * ```typescript
 * import { queueService } from './services/QueueService.js';
 * 
 * const position = await queueService.calculatePosition(1);
 * ```
 */
export const queueService = new QueueService();

