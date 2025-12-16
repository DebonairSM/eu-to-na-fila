import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { ticketService } from '../services/TicketService.js';
import { queueService } from '../services/QueueService.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

/**
 * Ticket routes.
 * Handles ticket creation, retrieval, and updates.
 */
export const ticketRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Create a new ticket (join queue).
   * If customer already has an active ticket, returns the existing ticket instead.
   * 
   * @route POST /api/shops/:slug/tickets
   * @param slug - Shop slug identifier
   * @body customerName - Customer's name
   * @body serviceId - ID of the service requested
   * @body customerPhone - Customer's phone (optional)
   * @returns Ticket with position and wait time (may be existing ticket if customer already in queue)
   * @throws {404} If shop or service not found
   * @throws {400} If validation fails
   * @throws {409} If queue is full
   */
  fastify.post('/shops/:slug/tickets', async (request, reply) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:30',message:'POST /shops/:slug/tickets entry',data:{params:request.params,body:request.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      // Validate params
      const paramsSchema = z.object({
        slug: z.string().min(1),
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:36',message:'Before params validation',data:{params:request.params},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const { slug } = validateRequest(paramsSchema, request.params);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:39',message:'Params validated',data:{slug},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Get shop
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:42',message:'Before shop lookup',data:{slug},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const shop = await db.query.shops.findFirst({
        where: eq(schema.shops.slug, slug),
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:47',message:'Shop lookup result',data:{slug,shopFound:!!shop,shopId:shop?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (!shop) {
        throw new NotFoundError(`Shop with slug "${slug}" not found`);
      }

      // Validate body - remove shopId from external request
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:54',message:'Before body validation',data:{body:request.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      const bodySchema = z.object({
        serviceId: z.number(),
        customerName: z.string().min(1).max(200),
        customerPhone: z.string().optional(),
        preferredBarberId: z.number().optional(),
      });
      const data = validateRequest(bodySchema, request.body);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:62',message:'Body validated',data:{serviceId:data.serviceId,customerName:data.customerName,hasPreferredBarber:!!data.preferredBarberId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Check if customer already has an active ticket
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:65',message:'Before existing ticket check',data:{shopId:shop.id,customerName:data.customerName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const existingTicket = await ticketService.findActiveTicketByCustomer(shop.id, data.customerName);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:68',message:'Existing ticket check result',data:{shopId:shop.id,customerName:data.customerName,hasExistingTicket:!!existingTicket,existingTicketId:existingTicket?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      if (existingTicket) {
        // Return existing ticket with 200 status (not a new resource)
        return reply.status(200).send(existingTicket);
      }

      // Create new ticket using service (includes position calculation and wait time)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:75',message:'Before ticketService.create',data:{shopId:shop.id,serviceId:data.serviceId,customerName:data.customerName,preferredBarberId:data.preferredBarberId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const ticket = await ticketService.create(shop.id, {
        ...data,
        shopId: shop.id,
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:81',message:'Ticket created successfully',data:{ticketId:ticket.id,position:ticket.position,estimatedWaitTime:ticket.estimatedWaitTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      return reply.status(201).send(ticket);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tickets.ts:86',message:'Error caught in route handler',data:{errorMessage:error instanceof Error?error.message:String(error),errorName:error instanceof Error?error.name:'unknown',errorStack:error instanceof Error?error.stack:undefined,errorCode:(error as any)?.code,statusCode:(error as any)?.statusCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw error;
    }
  });

  /**
   * Get a ticket by ID.
   * 
   * @route GET /api/tickets/:id
   * @param id - Ticket ID
   * @returns Ticket details
   * @throws {404} If ticket not found
   */
  fastify.get('/tickets/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const { id } = validateRequest(paramsSchema, request.params);

    const ticket = await ticketService.getById(id);

    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    return ticket;
  });

  /**
   * Update a ticket (assign barber, change status).
   * Requires staff or owner authentication.
   * 
   * @route PATCH /api/tickets/:id
   * @param id - Ticket ID
   * @body barberId - Barber ID to assign (optional, null to unassign)
   * @body status - New status (optional)
   * @returns Updated ticket
   * @throws {401} If not authenticated
   * @throws {404} If ticket not found
   */
  fastify.patch('/tickets/:id', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const bodySchema = z.object({
      barberId: z.number().int().positive().nullable().optional(),
      status: z.enum(['waiting', 'in_progress', 'completed', 'cancelled']).optional(),
    });

    const { id } = validateRequest(paramsSchema, request.params);
    const updates = validateRequest(bodySchema, request.body);

    const existingTicket = await ticketService.getById(id);
    if (!existingTicket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Use TicketService.updateStatus to ensure timestamps and audit logging are handled
    // If status is not provided, use existing status (allows updating just barberId)
    const updateData: { status: 'waiting' | 'in_progress' | 'completed' | 'cancelled'; barberId?: number } = {
      status: updates.status ?? existingTicket.status,
    };
    
    if (updates.barberId !== undefined) {
      // Convert null to undefined for the type system
      updateData.barberId = updates.barberId ?? undefined;
    }

    // Update via service to get proper timestamp handling and audit logging
    const updatedTicket = await ticketService.updateStatus(id, updateData);

    return updatedTicket;
  });

  /**
   * Cancel a ticket (public endpoint for customers).
   * Allows customers to cancel their own tickets without authentication.
   * 
   * @route POST /api/tickets/:id/cancel
   * @param id - Ticket ID
   * @returns Cancelled ticket
   * @throws {404} If ticket not found
   */
  fastify.post('/tickets/:id/cancel', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const { id } = validateRequest(paramsSchema, request.params);

    // Get ticket before cancelling
    const existingTicket = await ticketService.getById(id);
    if (!existingTicket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Only allow cancelling tickets that are waiting (customers can't cancel in_progress)
    if (existingTicket.status !== 'waiting') {
      throw new Error('Only waiting tickets can be cancelled by customers');
    }

    // Cancel ticket (customer cancellation)
    const ticket = await ticketService.cancel(id, 'Customer cancelled', 'customer');

    return ticket;
  });

  /**
   * Cancel a ticket (staff/owner endpoint).
   * Requires staff or owner authentication.
   * 
   * @route DELETE /api/tickets/:id
   * @param id - Ticket ID
   * @returns Cancelled ticket
   * @throws {401} If not authenticated
   * @throws {404} If ticket not found
   */
  fastify.delete('/tickets/:id', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const { id } = validateRequest(paramsSchema, request.params);

    // Get ticket before cancelling (for shop slug)
    const existingTicket = await ticketService.getById(id);
    if (!existingTicket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Cancel ticket (staff/owner cancellation)
    const ticket = await ticketService.cancel(id, 'Cancelled by staff/owner', 'staff');

    return ticket;
  });

  /**
   * Bulk delete all tickets for a shop (owner only).
   *
   * @route DELETE /api/shops/:slug/tickets
   * @param slug - Shop slug identifier
   * @returns { deletedCount: number }
   */
  fastify.delete('/shops/:slug/tickets', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const { slug } = validateRequest(paramsSchema, request.params);

    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    const deleted = await db
      .delete(schema.tickets)
      .where(eq(schema.tickets.shopId, shop.id))
      .returning({ id: schema.tickets.id });

    return { deletedCount: deleted.length };
  });
};

