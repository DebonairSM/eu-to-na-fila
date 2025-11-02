import { db, schema } from '../db/index.js';
import { eq, and, asc } from 'drizzle-orm';

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
    // Position 0 means not in active queue or currently being served
    if (position === 0) return null;

    // Get all waiting tickets ahead of this position
    const waitingTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting')
      ),
      orderBy: [asc(schema.tickets.createdAt)],
      with: {
        service: true,
      },
    });

    // Take only tickets ahead of current position
    const ticketsAhead = waitingTickets.slice(0, position - 1);

    if (ticketsAhead.length === 0) {
      // First in queue - check if any barbers are currently busy
      const inProgressTickets = await db.query.tickets.findMany({
        where: and(
          eq(schema.tickets.shopId, shopId),
          eq(schema.tickets.status, 'in_progress')
        ),
        with: {
          service: true,
        },
      });

      if (inProgressTickets.length === 0) {
        // No one being served, can start immediately
        return 0;
      }

      // Estimate based on average in-progress service time
      const avgDuration = inProgressTickets.reduce(
        (sum, t) => sum + (t.service?.duration || 30),
        0
      ) / inProgressTickets.length;

      return Math.ceil(avgDuration / 2); // Assume halfway done
    }

    // Calculate total duration of tickets ahead
    const totalDuration = ticketsAhead.reduce(
      (sum, ticket) => sum + (ticket.service?.duration || 30),
      0
    );

    // Get number of active barbers
    const activeBarbers = await db.query.barbers.findMany({
      where: and(
        eq(schema.barbers.shopId, shopId),
        eq(schema.barbers.isActive, true)
      ),
    });

    const barberCount = Math.max(activeBarbers.length, 1);

    // Divide by number of barbers (parallel processing)
    // Add buffer of 10% for transitions
    const estimatedTime = Math.ceil((totalDuration / barberCount) * 1.1);

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
        await db
          .update(schema.tickets)
          .set({ 
            position: newPosition,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.tickets.id, waitingTickets[i].id));
        
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
        eq(schema.barbers.isActive, true)
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
    maxQueueSize: number = 50
  ): Promise<boolean> {
    const { queueLength } = await this.getMetrics(shopId);
    return queueLength >= maxQueueSize;
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

