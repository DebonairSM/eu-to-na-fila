import { db, schema } from '../db/index.js';
import { eq, and, asc, or, isNull } from 'drizzle-orm';
import { auditService } from './AuditService.js';

/**
 * Service for managing queue operations.
 * 
 * Handles:
 * - Queue position calculation
 * - Wait time estimation
 * - Position recalculation after status changes
 * - Queue metrics
 */
export class QueueService {
  /**
   * Calculate queue position for a new ticket.
   * Position is based on the number of waiting tickets created before this one.
   * 
   * @param shopId - Shop database ID
   * @param createdAt - Ticket creation timestamp (for ordering)
   * @returns The position in queue (1-based index, 0 means not in active queue)
   * 
   * @example
   * ```typescript
   * const position = await queueService.calculatePosition(1, new Date());
   * // Returns: 5 (fifth in queue)
   * ```
   */
  async calculatePosition(
    shopId: number,
    createdAt: Date = new Date()
  ): Promise<number> {
    // Get all waiting tickets for this shop created before this time
    const waitingTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting')
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
   * Calculate estimated wait time based on queue position and service durations.
   * 
   * Algorithm:
   * 1. Get all tickets ahead in queue
   * 2. Sum their service durations
   * 3. Factor in number of active barbers (parallel processing)
   * 
   * @param shopId - Shop database ID
   * @param position - Position in queue (1-based)
   * @returns Estimated wait time in minutes (null if position is 0 or being served)
   * 
   * @example
   * ```typescript
   * const waitTime = await queueService.calculateWaitTime(1, 3);
   * // Returns: 45 (approximately 45 minutes)
   * ```
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
    const totalBarberCount = Math.max(activeBarbers.length, 1);

    // Get all in-progress tickets to find which barbers are busy
    const inProgressTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'in_progress')
      ),
    });
    
    // Filter to only tickets with assigned barbers (barbers that are actually working)
    const inProgressTicketsWithBarbers = inProgressTickets.filter(t => t.barberId !== null);

    // Count how many unique barbers are currently working
    const busyBarberIds = new Set(
      inProgressTicketsWithBarbers
        .map(t => t.barberId)
        .filter((id): id is number => id !== null)
    );
    const busyBarberCount = busyBarberIds.size;
    const availableBarberCount = Math.max(0, totalBarberCount - busyBarberCount);

    // Waiting tickets ahead of this position
    const waitingTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting')
      ),
      orderBy: [asc(schema.tickets.createdAt)],
    });
    const ticketsAhead = waitingTickets.slice(0, Math.max(position - 1, 0));
    const peopleAhead = ticketsAhead.length;

    // Calculate remaining in-progress time (only for tickets with assigned barbers)
    const remainingInProgress = inProgressTicketsWithBarbers.reduce((sum, t) => {
      const updatedAt = t.updatedAt ? new Date(t.updatedAt) : now;
      const elapsedMinutes = Math.max(0, (now.getTime() - updatedAt.getTime()) / 60000);
      const remaining = Math.max(0, 20 - elapsedMinutes);
      return sum + remaining;
    }, 0);

    // If no people ahead and barbers are available → immediate service (0 minutes)
    if (peopleAhead === 0 && availableBarberCount > 0) {
      return 0;
    }

    // If no people ahead but all barbers are busy → wait for first barber to finish
    if (peopleAhead === 0 && availableBarberCount === 0) {
      // Return minimum remaining time (time until first barber is free)
      const remainingTimes = inProgressTicketsWithBarbers
        .map(t => {
          const updatedAt = t.updatedAt ? new Date(t.updatedAt) : now;
          const elapsedMinutes = Math.max(0, (now.getTime() - updatedAt.getTime()) / 60000);
          return Math.max(0, 20 - elapsedMinutes);
        })
        .filter(t => t > 0);
      
      if (remainingTimes.length === 0) {
        return 0; // All services just finished
      }
      return Math.ceil(Math.min(...remainingTimes));
    }

    // If people ahead, calculate based on available barbers
    // Use available barbers if any, otherwise use total barbers
    const effectiveBarberCount = availableBarberCount > 0 ? availableBarberCount : totalBarberCount;
    
    // Distribute work across available barbers
    const parallelShare = peopleAhead > 0 ? (peopleAhead * 20) / effectiveBarberCount : 0;
    
    // Only add remaining in-progress time if all barbers are busy
    // If there are available barbers, they can start immediately on waiting customers
    const additionalWaitTime = availableBarberCount === 0 ? remainingInProgress : 0;
    
    const totalWorkMinutes = Math.max(0, parallelShare) + additionalWaitTime;
    const estimatedTime = Math.ceil(totalWorkMinutes);

    return estimatedTime;
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
    // Get waiting tickets
    const waitingTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting')
      ),
    });

    // Get in-progress tickets
    const inProgressTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'in_progress')
      ),
    });

    // Get active barbers
    const activeBarbers = await db.query.barbers.findMany({
      where: and(
        eq(schema.barbers.shopId, shopId),
        eq(schema.barbers.isActive, true),
        eq(schema.barbers.isPresent, true)
      ),
    });

    // Calculate average wait time from waiting tickets
    const totalWaitTime = waitingTickets.reduce(
      (sum, ticket) => sum + (ticket.estimatedWaitTime || 0),
      0
    );
    const averageWaitTime = waitingTickets.length > 0
      ? Math.ceil(totalWaitTime / waitingTickets.length)
      : 0;

    return {
      queueLength: waitingTickets.length,
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

    // Use barberCount = 1 (only that one barber is available - customer doesn't benefit from pool)
    const barberCount = 1;

    // Get waiting tickets that are ahead for this preferred barber
    // Only count tickets with the same preferred barber (not general queue tickets)
    // General queue tickets can be taken by any barber, so we don't count them for wait time
    const waitingTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting'),
        eq(schema.tickets.preferredBarberId, preferredBarberId) // Only same preferred barber
      ),
      orderBy: [asc(schema.tickets.createdAt)],
    });
    
    // Filter tickets created BEFORE this ticket (tickets ahead in queue)
    // This ensures we only count tickets that are actually ahead
    const ticketsAhead = waitingTickets.filter(
      ticket => new Date(ticket.createdAt) < createdAt
    );

    // Count only tickets that are actually ahead for this preferred barber
    const peopleAhead = ticketsAhead.length;

    // In-progress tickets for that specific barber only
    const inProgressTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'in_progress'),
        eq(schema.tickets.barberId, preferredBarberId)
      ),
      orderBy: [asc(schema.tickets.updatedAt)],
    });

    const remainingInProgress = inProgressTickets.reduce((sum, t) => {
      const updatedAt = t.updatedAt ? new Date(t.updatedAt) : now;
      const elapsedMinutes = Math.max(0, (now.getTime() - updatedAt.getTime()) / 60000);
      const remaining = Math.max(0, 20 - elapsedMinutes);
      return sum + remaining;
    }, 0);

    // Formula: (peopleAhead * 20) / 1 + remainingInProgressForBarber
    // peopleAhead is already calculated above from ticketsAhead.length
    const parallelShare = peopleAhead > 0 ? (peopleAhead * 20) / barberCount : 0;
    const totalWorkMinutes = Math.max(0, parallelShare) + remainingInProgress;
    const estimatedTime = Math.ceil(totalWorkMinutes);

    return estimatedTime;
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

