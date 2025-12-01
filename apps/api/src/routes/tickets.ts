import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { createTicketSchema } from '@eutonafila/shared';
import { ticketService } from '../services/TicketService.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
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
    // Validate params
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const { slug } = validateRequest(paramsSchema, request.params);

    // Get shop
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    // Validate body - remove shopId from external request
    const bodySchema = z.object({
      serviceId: z.number(),
      customerName: z.string().min(1).max(200),
      customerPhone: z.string().optional(),
    });
    const data = validateRequest(bodySchema, request.body);

    // Check if customer already has an active ticket
    const existingTicket = await ticketService.findActiveTicketByCustomer(shop.id, data.customerName);
    
    if (existingTicket) {
      // Return existing ticket with 200 status (not a new resource)
      return reply.status(200).send(existingTicket);
    }

    // Create new ticket using service (includes position calculation and wait time)
    const ticket = await ticketService.create(shop.id, {
      ...data,
      shopId: shop.id,
    });

    return reply.status(201).send(ticket);
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

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.barberId !== undefined) {
      updateData.barberId = updates.barberId;
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }

    const [updatedTicket] = await db
      .update(schema.tickets)
      .set(updateData)
      .where(eq(schema.tickets.id, id))
      .returning();

    return updatedTicket;
  });

  /**
   * Cancel a ticket.
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

    // Cancel ticket
    const ticket = await ticketService.cancel(id);

    return ticket;
  });
};

