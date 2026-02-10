import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { UpdateTicketStatus } from '@eutonafila/shared';
import { createAppointmentSchema } from '@eutonafila/shared';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { ticketService, queueService } from '../services/index.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getShopBySlug } from '../lib/shop.js';
import { shapeTicketResponse } from '../lib/ticketResponse.js';
import { parseSettings } from '../lib/settings.js';

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

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const settings = parseSettings(shop.settings);

    // Validate body - remove shopId from external request
    const bodySchema = z.object({
      serviceId: z.number(),
      customerName: z.string().min(1).max(200),
      customerPhone: z.string().optional(),
      preferredBarberId: z.number().optional(),
      deviceId: z.string().optional(), // Device identifier for preventing multiple active tickets per device
    });
    const data = validateRequest(bodySchema, request.body);

    // Enforce per-shop required fields
    if (settings.requirePhone && !data.customerPhone) {
      throw new ValidationError('Phone number is required', [
        { field: 'customerPhone', message: 'Este campo é obrigatório' },
      ]);
    }
    if (settings.requireBarberChoice && !data.preferredBarberId) {
      throw new ValidationError('Barber selection is required', [
        { field: 'preferredBarberId', message: 'Escolha um barbeiro' },
      ]);
    }

    // Check for existing active ticket by device FIRST (before creating)
    // Device-based check takes priority to prevent multiple tickets from same device
    if (data.deviceId && data.deviceId.trim().length > 0) {
      const existingTicketByDevice = await ticketService.findActiveTicketByDevice(shop.id, data.deviceId);
      if (existingTicketByDevice) {
        // Device already has an active ticket - return it with 200 status (existing resource)
        return reply.status(200).send(existingTicketByDevice);
      }
    }

    // Create ticket using service (service.create() also checks internally for safety)
    // It will check by deviceId first, then by customerName as fallback
    const beforeCreate = Date.now();
    const ticket = await ticketService.create(shop.id, {
      ...data,
      shopId: shop.id,
    });

    // Determine if this is a new ticket or existing ticket returned by service
    // Check if ticket was created just now (within last 2 seconds) or if it's older (existing)
    const ticketCreatedAt = ticket.createdAt ? new Date(ticket.createdAt).getTime() : 0;
    const ticketAge = beforeCreate - ticketCreatedAt;
    
    // If ticket age is > 2 seconds, it's an existing ticket (service returned existing due to race condition)
    // Otherwise, it's a newly created ticket
    if (ticketAge > 2000 || ticketAge < -1000) {
      // Existing ticket (either old ticket or race condition) - return 200
      return reply.status(200).send(ticket);
    }

    // New ticket created - return 201
    return reply.status(201).send(ticket);
  });

  /**
   * Create an appointment (staff/owner/barber only). Requires shop settings.allowAppointments.
   * @route POST /api/shops/:slug/tickets/appointment
   */
  fastify.post('/shops/:slug/tickets/appointment', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff', 'barber'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);
    const bodySchema = createAppointmentSchema.omit({ shopId: true });
    const data = validateRequest(bodySchema, request.body);
    const scheduledTime = typeof data.scheduledTime === 'string' ? new Date(data.scheduledTime) : data.scheduledTime;
    const ticket = await ticketService.createAppointment(shop.id, {
      serviceId: data.serviceId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      scheduledTime,
    });
    return reply.status(201).send(shapeTicketResponse(ticket as Record<string, unknown>));
  });

  /**
   * Check in an appointment (pending -> waiting). Staff/owner/barber only.
   * @route POST /api/shops/:slug/tickets/:id/check-in
   */
  fastify.post('/shops/:slug/tickets/:id/check-in', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff', 'barber'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
      id: z.coerce.number().int().positive(),
    });
    const { slug, id } = validateRequest(paramsSchema, request.params);
    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);
    const ticket = await ticketService.checkIn(id);
    if (ticket.shopId !== shop.id) throw new NotFoundError(`Ticket with ID ${id} not found`);
    return reply.send(shapeTicketResponse(ticket as Record<string, unknown>));
  });

  /**
   * Get active ticket for a device.
   * Used to check if device already has an active ticket before attempting to create one.
   * 
   * @route GET /api/shops/:slug/tickets/active
   * @param slug - Shop slug identifier
   * @query deviceId - Device identifier (required)
   * @returns Active ticket if found (status 200), or 404 if not found
   * @throws {400} If deviceId is missing
   * @throws {404} If shop not found or no active ticket for device
   */
  fastify.get('/shops/:slug/tickets/active', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const { slug } = validateRequest(paramsSchema, request.params);

    const querySchema = z.object({
      deviceId: z.string().min(1),
    });
    const { deviceId } = validateRequest(querySchema, request.query);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    // Find active ticket for device
    const ticket = await ticketService.findActiveTicketByDevice(shop.id, deviceId);

    if (!ticket) {
      throw new NotFoundError('No active ticket found for this device');
    }

    return ticket;
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

    return shapeTicketResponse(ticket as Record<string, unknown>);
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
    preHandler: [requireAuth(), requireRole(['owner', 'staff', 'barber'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const bodySchema = z.object({
      barberId: z.number().int().positive().nullable().optional(),
      status: z.enum(['pending', 'waiting', 'in_progress', 'completed', 'cancelled']).optional(),
    });

    const { id } = validateRequest(paramsSchema, request.params);
    const updates = validateRequest(bodySchema, request.body);

    if (request.user?.role === 'barber' && updates.barberId !== undefined && updates.barberId !== null && updates.barberId !== request.user.barberId) {
      throw new ForbiddenError('Barbers can only assign tickets to themselves');
    }

    const existingTicket = await ticketService.getById(id);
    if (!existingTicket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Use TicketService.updateStatus to ensure timestamps and audit logging are handled
    // If status is not provided, use existing status (allows updating just barberId)
    const updateData: UpdateTicketStatus = {
      status: updates.status ?? existingTicket.status,
    };
    
    if (updates.barberId !== undefined) {
      // Pass null directly to unassign barber (don't convert to undefined)
      updateData.barberId = updates.barberId;
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

    // Load shop settings for cancellation rules
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.id, existingTicket.shopId),
    });
    const settings = parseSettings(shop?.settings);

    // Check if customer is allowed to cancel this ticket
    const canCancel = existingTicket.status === 'waiting'
      || (settings.allowCustomerCancelInProgress && existingTicket.status === 'in_progress');

    if (!canCancel) {
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

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const deleted = await db
      .delete(schema.tickets)
      .where(eq(schema.tickets.shopId, shop.id))
      .returning({ id: schema.tickets.id });

    return { deletedCount: deleted.length };
  });
};

