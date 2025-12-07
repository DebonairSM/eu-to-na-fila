import { db, schema } from '../db/index.js';
import { eq, and, or } from 'drizzle-orm';
import type { CreateTicket, UpdateTicketStatus, Ticket } from '@eutonafila/shared';
import { queueService } from './QueueService.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';

/**
 * Service for managing ticket operations.
 * 
 * Handles:
 * - Ticket creation and validation
 * - Status updates with business logic
 * - Ticket retrieval
 * - Queue position management
 */
export class TicketService {
  /**
   * Get a ticket by ID.
   * 
   * @param id - Ticket ID
   * @returns The ticket with related data, or null if not found
   * 
   * @example
   * ```typescript
   * const ticket = await ticketService.getById(42);
   * if (!ticket) {
   *   throw new NotFoundError('Ticket not found');
   * }
   * ```
   */
  async getById(id: number): Promise<Ticket | null> {
    const ticket = await db.query.tickets.findFirst({
      where: eq(schema.tickets.id, id),
      with: {
        shop: true,
        service: true,
        barber: true,
      },
    });

    return ticket as Ticket | null;
  }

  /**
   * Get all tickets for a shop.
   * 
   * @param shopId - Shop database ID
   * @param status - Optional status filter
   * @returns Array of tickets
   * 
   * @example
   * ```typescript
   * // Get all tickets
   * const allTickets = await ticketService.getByShop(1);
   * 
   * // Get only waiting tickets
   * const waitingTickets = await ticketService.getByShop(1, 'waiting');
   * ```
   */
  async getByShop(
    shopId: number,
    status?: 'waiting' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<Ticket[]> {
    const whereClause = status
      ? and(
          eq(schema.tickets.shopId, shopId),
          eq(schema.tickets.status, status)
        )
      : eq(schema.tickets.shopId, shopId);

    const tickets = await db.query.tickets.findMany({
      where: whereClause,
      with: {
        service: true,
        barber: true,
      },
      orderBy: (tickets, { asc }) => [asc(tickets.createdAt)],
    });

    return tickets as Ticket[];
  }

  /**
   * Find an active ticket for a customer (waiting or in_progress status).
   * 
   * @param shopId - Shop database ID
   * @param customerName - Customer's name
   * @returns The active ticket if found, null otherwise
   * 
   * @example
   * ```typescript
   * const existingTicket = await ticketService.findActiveTicketByCustomer(1, 'João Silva');
   * if (existingTicket) {
   *   // Customer already in queue
   * }
   * ```
   */
  async findActiveTicketByCustomer(shopId: number, customerName: string): Promise<Ticket | null> {
    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.customerName, customerName),
        or(
          eq(schema.tickets.status, 'waiting'),
          eq(schema.tickets.status, 'in_progress')
        )
      ),
      with: {
        shop: true,
        service: true,
        barber: true,
      },
      orderBy: (tickets, { desc }) => [desc(tickets.createdAt)], // Get most recent
    });

    return ticket as Ticket | null;
  }

  /**
   * Create a new ticket and add it to the queue.
   * If customer already has an active ticket, returns the existing ticket instead.
   * 
   * @param shopId - Shop database ID
   * @param data - Ticket creation data
   * @returns The created ticket (or existing ticket if customer already in queue) with position and estimated wait time
   * @throws {Error} If shop or service doesn't exist
   * @throws {Error} If queue is full
   * 
   * @example
   * ```typescript
   * const ticket = await ticketService.create(1, {
   *   serviceId: 2,
   *   customerName: 'João Silva',
   *   customerPhone: '11999999999'
   * });
   * // Returns ticket with position: 3, estimatedWaitTime: 45
   * // Or returns existing ticket if customer already in queue
   * ```
   */
  async create(shopId: number, data: CreateTicket): Promise<Ticket> {
    // Verify shop exists
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.id, shopId),
    });

    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    // Verify service exists and belongs to shop
    const service = await db.query.services.findFirst({
      where: and(
        eq(schema.services.id, data.serviceId),
        eq(schema.services.shopId, shopId)
      ),
    });

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    if (!service.isActive) {
      throw new ConflictError('Service is not active');
    }

    // Check if customer already has an active ticket
    const existingTicket = await this.findActiveTicketByCustomer(shopId, data.customerName);
    if (existingTicket) {
      // Return existing ticket instead of creating a new one
      return existingTicket;
    }

    // Check if queue is full
    const isQueueFull = await queueService.isQueueFull(shopId);
    if (isQueueFull) {
      throw new ConflictError('Queue is full');
    }

    // Calculate position and wait time
    const now = new Date();
    const position = await queueService.calculatePosition(shopId, now);
    const estimatedWaitTime = await queueService.calculateWaitTime(shopId, position);

    // Create ticket
    const [ticket] = await db
      .insert(schema.tickets)
      .values({
        shopId,
        serviceId: data.serviceId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        status: 'waiting',
        position,
        estimatedWaitTime,
      })
      .returning();

    // Recalculate wait times for other tickets
    await this.recalculateWaitTimes(shopId);

    return ticket as Ticket;
  }

  /**
   * Update a ticket's status.
   * Handles state transitions and business logic.
   * 
   * @param id - Ticket ID
   * @param data - Status update data
   * @returns The updated ticket
   * @throws {Error} If ticket doesn't exist
   * @throws {Error} If barber doesn't exist or is inactive
   * @throws {Error} If status transition is invalid
   * 
   * @example
   * ```typescript
   * // Start service
   * const ticket = await ticketService.updateStatus(42, {
   *   status: 'in_progress',
   *   barberId: 3
   * });
   * 
   * // Complete service
   * await ticketService.updateStatus(42, {
   *   status: 'completed'
   * });
   * ```
   */
  async updateStatus(
    id: number,
    data: UpdateTicketStatus
  ): Promise<Ticket> {
    // Get existing ticket
    const existingTicket = await this.getById(id);
    if (!existingTicket) {
      throw new Error('Ticket not found');
    }

    // Validate status transition
    this.validateStatusTransition(existingTicket.status, data.status);

    // If assigning a barber, verify they exist and are active
    if (data.barberId) {
      const barber = await db.query.barbers.findFirst({
        where: eq(schema.barbers.id, data.barberId),
      });

      if (!barber) {
        throw new Error('Barber not found');
      }

      if (!barber.isActive) {
        throw new Error('Barber is not active');
      }

      // Verify barber belongs to same shop
      if (barber.shopId !== existingTicket.shopId) {
        throw new Error('Barber does not belong to this shop');
      }
    }

    // Update ticket
    const updateData: any = {
      status: data.status,
      updatedAt: new Date(),
    };

    // Set position based on status
    if (data.status === 'in_progress' || data.status === 'completed' || data.status === 'cancelled') {
      updateData.position = 0;
      updateData.estimatedWaitTime = null;
    }

    // Set barber if provided
    if (data.barberId !== undefined) {
      updateData.barberId = data.barberId;
    }

    const [ticket] = await db
      .update(schema.tickets)
      .set(updateData)
      .where(eq(schema.tickets.id, id))
      .returning();

    // Recalculate positions and wait times for remaining queue
    await queueService.recalculatePositions(existingTicket.shopId);
    await this.recalculateWaitTimes(existingTicket.shopId);

    return ticket as Ticket;
  }

  /**
   * Cancel a ticket.
   * Convenience method for updating status to cancelled.
   * 
   * @param id - Ticket ID
   * @returns The cancelled ticket
   */
  async cancel(id: number): Promise<Ticket> {
    return this.updateStatus(id, { status: 'cancelled' });
  }

  /**
   * Recalculate wait times for all waiting tickets in a shop.
   * Should be called after ticket creation or status change.
   * 
   * @param shopId - Shop database ID
   */
  private async recalculateWaitTimes(shopId: number): Promise<void> {
    const waitingTickets = await this.getByShop(shopId, 'waiting');

    for (const ticket of waitingTickets) {
      const waitTime = await queueService.calculateWaitTime(shopId, ticket.position);
      
      await db
        .update(schema.tickets)
        .set({ 
          estimatedWaitTime: waitTime,
          updatedAt: new Date(),
        })
        .where(eq(schema.tickets.id, ticket.id));
    }
  }

  /**
   * Validate a status transition.
   * 
   * @param currentStatus - Current ticket status
   * @param newStatus - Desired new status
   * @throws {Error} If transition is not allowed
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): void {
    const validTransitions: Record<string, string[]> = {
      waiting: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [], // Cannot transition from completed
      cancelled: [], // Cannot transition from cancelled
    };

    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Get statistics for a shop's tickets.
   * 
   * @param shopId - Shop database ID
   * @param since - Start date for statistics (optional)
   * @returns Ticket statistics
   * 
   * @example
   * ```typescript
   * const stats = await ticketService.getStatistics(1);
   * // Returns: { total: 100, completed: 85, cancelled: 5, waiting: 10 }
   * ```
   */
  async getStatistics(
    shopId: number,
    since?: Date
  ): Promise<{
    total: number;
    waiting: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  }> {
    const whereClause = since
      ? and(
          eq(schema.tickets.shopId, shopId),
          // Note: This would require a proper date comparison
          // For now, getting all tickets
        )
      : eq(schema.tickets.shopId, shopId);

    const tickets = await db.query.tickets.findMany({
      where: whereClause,
    });

    return {
      total: tickets.length,
      waiting: tickets.filter(t => t.status === 'waiting').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      completed: tickets.filter(t => t.status === 'completed').length,
      cancelled: tickets.filter(t => t.status === 'cancelled').length,
    };
  }
}

/**
 * Singleton instance of TicketService.
 * Use this exported instance throughout the application.
 * 
 * @example
 * ```typescript
 * import { ticketService } from './services/TicketService.js';
 * 
 * const ticket = await ticketService.create(shopId, data);
 * ```
 */
export const ticketService = new TicketService();

