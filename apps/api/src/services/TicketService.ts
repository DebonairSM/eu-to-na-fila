import { db, schema } from '../db/index.js';
import { eq, and, or, ne } from 'drizzle-orm';
import type { CreateTicket, UpdateTicketStatus, Ticket } from '@eutonafila/shared';
import { queueService } from './QueueService.js';
import { auditService } from './AuditService.js';
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

    // Validate preferred barber if provided
    if (data.preferredBarberId) {
      const preferredBarber = await db.query.barbers.findFirst({
        where: eq(schema.barbers.id, data.preferredBarberId),
      });

      if (!preferredBarber) {
        throw new NotFoundError('Preferred barber not found');
      }

      if (!preferredBarber.isActive) {
        throw new ConflictError('Preferred barber is not active');
      }

      // Verify preferred barber belongs to same shop
      if (preferredBarber.shopId !== shopId) {
        throw new ConflictError('Preferred barber does not belong to this shop');
      }
    }

    // Calculate position and wait time
    const now = new Date();
    let position: number;
    let estimatedWaitTime: number | null;

    if (data.preferredBarberId) {
      // Use preferred barber calculation methods
      position = await queueService.calculatePositionForPreferredBarber(
        shopId,
        data.preferredBarberId,
        now
      );
      estimatedWaitTime = await queueService.calculateWaitTimeForPreferredBarber(
        shopId,
        data.preferredBarberId,
        position,
        now
      );
    } else {
      // Use standard calculation methods
      position = await queueService.calculatePosition(shopId, now);
      estimatedWaitTime = await queueService.calculateWaitTime(shopId, position);
    }

    // Create ticket
    const [ticket] = await db
      .insert(schema.tickets)
      .values({
        shopId,
        serviceId: data.serviceId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        preferredBarberId: data.preferredBarberId,
        status: 'waiting',
        position,
        estimatedWaitTime,
      })
      .returning();

    // Log ticket creation
    auditService.logTicketCreated(ticket.id, shopId, {
      customerName: data.customerName,
      serviceId: data.serviceId,
      preferredBarberId: data.preferredBarberId,
      actorType: 'customer',
    });

    // Log barber preference if set
    if (data.preferredBarberId) {
      auditService.logBarberPreferenceSet(ticket.id, shopId, data.preferredBarberId);
    }

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

      // Check if barber is already serving another client
      // Only validate when assigning to in_progress status
      if (data.status === 'in_progress') {
        const existingInProgressTicket = await db.query.tickets.findFirst({
          where: and(
            eq(schema.tickets.barberId, data.barberId),
            eq(schema.tickets.status, 'in_progress'),
            // Exclude the current ticket if we're updating it (reassignment to same barber is fine)
            ne(schema.tickets.id, id)
          ),
        });

        if (existingInProgressTicket) {
          throw new ConflictError('Barbeiro já está atendendo outro cliente');
        }
      }
    }

    // Update ticket
    const now = new Date();
    const updateData: any = {
      status: data.status,
      updatedAt: now,
    };

    // Set timestamps based on status changes
    if (data.status === 'in_progress' && existingTicket.status !== 'in_progress') {
      updateData.startedAt = now;
    }
    if (data.status === 'completed' && existingTicket.status !== 'completed') {
      updateData.completedAt = now;
    }
    if (data.status === 'cancelled' && existingTicket.status !== 'cancelled') {
      updateData.cancelledAt = now;
    }

    // Set position based on status
    if (data.status === 'in_progress' || data.status === 'completed' || data.status === 'cancelled') {
      updateData.position = 0;
      updateData.estimatedWaitTime = null;
    }

    // Set barber if provided
    if (data.barberId !== undefined) {
      const isNewAssignment = existingTicket.barberId !== data.barberId && data.barberId !== null;
      updateData.barberId = data.barberId;
      if (isNewAssignment) {
        updateData.barberAssignedAt = now;
      }
    }

    const [ticket] = await db
      .update(schema.tickets)
      .set(updateData)
      .where(eq(schema.tickets.id, id))
      .returning();

    // Log actions based on changes
    if (data.barberId !== undefined && existingTicket.barberId !== data.barberId && data.barberId !== null) {
      auditService.logBarberAssigned(id, existingTicket.shopId, data.barberId, {
        actorType: 'staff',
      });
    }

    if (data.status === 'in_progress' && existingTicket.status !== 'in_progress') {
      const barberIdForLog = data.barberId || existingTicket.barberId;
      if (barberIdForLog) {
        auditService.logServiceStarted(id, existingTicket.shopId, barberIdForLog, {
          actorType: 'staff',
        });
      }
    }

    if (data.status === 'completed' && existingTicket.status !== 'completed') {
      const barberIdForLog = data.barberId || existingTicket.barberId || ticket.barberId;
      if (barberIdForLog) {
        auditService.logServiceCompleted(id, existingTicket.shopId, barberIdForLog, {
          actorType: 'staff',
        });
      }
    }

    if (data.status === 'cancelled' && existingTicket.status !== 'cancelled') {
      auditService.logTicketCancelled(id, existingTicket.shopId, {
        reason: 'Status updated to cancelled',
        actorType: 'staff',
      });
    }

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
   * @param reason - Optional reason for cancellation
   * @param actorType - Type of actor cancelling (default: 'customer')
   * @returns The cancelled ticket
   */
  async cancel(id: number, reason?: string, actorType: 'customer' | 'staff' | 'owner' = 'customer'): Promise<Ticket> {
    const ticket = await this.updateStatus(id, { status: 'cancelled' });
    
    // Log cancellation (updateStatus already logs, but we add reason here if provided)
    if (reason) {
      auditService.logTicketCancelled(id, ticket.shopId, {
        reason,
        actorType,
      });
    }
    
    return ticket;
  }

  /**
   * Recalculate wait times for all waiting tickets in a shop.
   * Should be called after ticket creation or status change.
   * Uses specialized calculation for tickets with preferred barbers.
   * 
   * @param shopId - Shop database ID
   */
  private async recalculateWaitTimes(shopId: number): Promise<void> {
    const waitingTickets = await this.getByShop(shopId, 'waiting');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TicketService.ts:368',message:'recalculateWaitTimes started',data:{shopId,waitingTicketCount:waitingTickets.length,waitingTicketIds:waitingTickets.map(t=>t.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Recalculate all tickets - this ensures positions and wait times are accurate
    // after any status changes (e.g., when someone ahead gets taken by a different barber)
    for (const ticket of waitingTickets) {
      let waitTime: number | null;
      let position: number;

      if (ticket.preferredBarberId) {
        // Use preferred barber calculation
        // Recalculate position first - this will correctly exclude tickets that are no longer waiting
        const ticketCreatedAt = new Date(ticket.createdAt);
        position = await queueService.calculatePositionForPreferredBarber(
          shopId,
          ticket.preferredBarberId,
          ticketCreatedAt
        );
        // Then calculate wait time with the updated position and createdAt
        // This ensures we only count tickets that were actually created before this ticket
        waitTime = await queueService.calculateWaitTimeForPreferredBarber(
          shopId,
          ticket.preferredBarberId,
          position,
          ticketCreatedAt
        );
      } else {
        // Use standard calculation
        // Recalculate position first
        position = await queueService.calculatePosition(
          shopId,
          new Date(ticket.createdAt)
        );
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TicketService.ts:396',message:'Position calculated for ticket',data:{ticketId:ticket.id,calculatedPosition:position,oldPosition:ticket.position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // Then calculate wait time with the updated position
        waitTime = await queueService.calculateWaitTime(shopId, position);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TicketService.ts:401',message:'Wait time calculated for ticket',data:{ticketId:ticket.id,position,calculatedWaitTime:waitTime,oldWaitTime:ticket.estimatedWaitTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }
      
      // Log changes if they occurred
      if (ticket.position !== position) {
        auditService.logPositionUpdated(ticket.id, shopId, ticket.position, position);
      }
      if (ticket.estimatedWaitTime !== waitTime) {
        auditService.logWaitTimeUpdated(ticket.id, shopId, ticket.estimatedWaitTime ?? null, waitTime);
      }

      // Update both position and wait time
      await db
        .update(schema.tickets)
        .set({ 
          position,
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

  /**
   * Recalculate positions and wait times for a shop (owner/admin utility).
   */
  async recalculateShopQueue(shopId: number): Promise<void> {
    await queueService.recalculatePositions(shopId);
    await this.recalculateWaitTimes(shopId);
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

