import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { UpdateTicketStatus } from '@eutonafila/shared';
import { createAppointmentSchema } from '@eutonafila/shared';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { ticketService, queueService } from '../services/index.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError, ForbiddenError, InternalError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getShopBySlug } from '../lib/shop.js';
import { shapeTicketResponse } from '../lib/ticketResponse.js';
import { parseSettings } from '../lib/settings.js';
import { getAppointmentSlots, utcToShopLocal } from '../lib/appointmentSlots.js';
import { sendAppointmentReminder } from '../services/EmailService.js';
import { getHomeContentForLocale } from '@eutonafila/shared';

const reminderSentTicketIds = new Set<number>();

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
    // Barber is always optional (preferred barber); never required for clients.

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
      preferredBarberId: data.preferredBarberId,
      scheduledTime,
    });
    return reply.status(201).send(shapeTicketResponse(ticket as Record<string, unknown>));
  });

  /**
   * Book an appointment (public). Validates slot is available, then creates appointment.
   * @route POST /api/shops/:slug/appointments/book
   */
  fastify.post('/shops/:slug/appointments/book', async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const bodySchema = z.object({
      serviceId: z.number(),
      customerName: z.string().min(1).max(200),
      customerPhone: z.string().optional(),
      preferredBarberId: z.number().optional(),
      scheduledTime: z.string(),
      deviceId: z.string().optional(),
    });
    const data = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);
    const settings = parseSettings(shop.settings);
    if (!settings.allowAppointments) throw new ValidationError('Appointments not enabled for this shop');

    const timezone = settings.timezone ?? 'America/Sao_Paulo';
    const { dateStr, timeStr } = utcToShopLocal(data.scheduledTime, timezone);

    const { slots } = await getAppointmentSlots(shop, dateStr, data.serviceId, data.preferredBarberId ?? undefined);
    const slot = slots.find((sl) => sl.time === timeStr);
    if (!slot || !slot.available) throw new ValidationError('This time slot is no longer available');

    const ticket = await ticketService.createAppointment(shop.id, {
      serviceId: data.serviceId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      preferredBarberId: data.preferredBarberId,
      scheduledTime: data.scheduledTime,
    });
    return reply.status(201).send(shapeTicketResponse(ticket as Record<string, unknown>));
  });

  /**
   * Send appointment reminder email (public). Rate-limited to one per ticket.
   * @route POST /api/shops/:slug/appointments/:id/remind
   */
  fastify.post('/shops/:slug/appointments/:id/remind', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
      id: z.coerce.number().int().positive(),
    });
    const { slug, id: ticketId } = validateRequest(paramsSchema, request.params);
    const bodySchema = z.object({ email: z.string().email() });
    const { email } = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const ticket = await ticketService.getById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket not found');
    if (ticket.shopId !== shop.id) throw new NotFoundError('Ticket not found');
    if ((ticket as { type?: string }).type !== 'appointment') throw new ValidationError('Only appointments can have reminders');

    if (reminderSentTicketIds.has(ticketId)) {
      return reply.status(200).send({ sent: true, message: 'Reminder already sent' });
    }

    const service = await db.query.services.findFirst({
      where: eq(schema.services.id, ticket.serviceId),
      columns: { name: true },
    });
    const barberId = (ticket as { preferredBarberId?: number }).preferredBarberId ?? (ticket as { barberId?: number }).barberId;
    let barberName: string | null = null;
    if (barberId) {
      const barber = await db.query.barbers.findFirst({
        where: eq(schema.barbers.id, barberId),
        columns: { name: true },
      });
      barberName = barber?.name ?? null;
    }

    const homeContent = getHomeContentForLocale(shop.homeContent, 'pt-BR');
    const address = homeContent?.location?.address ?? null;

    const scheduledTime = (ticket as { scheduledTime?: Date | string }).scheduledTime;
    const scheduledAt = scheduledTime ? new Date(scheduledTime) : new Date();

    const sent = await sendAppointmentReminder(email, {
      shopName: shop.name,
      serviceName: service?.name ?? 'Serviço',
      scheduledAt,
      barberName: barberName ?? undefined,
      address: address ?? undefined,
    });

    if (sent) reminderSentTicketIds.add(ticketId);

    return reply.send({ sent });
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
   * Get available appointment slots for a date (public).
   * @route GET /api/shops/:slug/appointments/slots
   * @query date - YYYY-MM-DD
   * @query serviceId - Service ID
   * @query barberId - Optional; if set, only slots where this barber is free
   */
  fastify.get('/shops/:slug/appointments/slots', async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const querySchema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      serviceId: z.coerce.number().int().positive(),
      barberId: z.coerce.number().int().positive().optional(),
    });
    const { date: dateStr, serviceId, barberId } = validateRequest(querySchema, request.query);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const { slots } = await getAppointmentSlots(shop, dateStr, serviceId, barberId);
    return reply.send({ slots });
  });

  /**
   * Get active ticket for a device.
   * Used to check if device already has an active ticket before attempting to create one.
   *
   * @route GET /api/shops/:slug/tickets/active
   * @param slug - Shop slug identifier
   * @query deviceId - Device identifier (required)
   * @returns 200 with active ticket if found, or 200 with null if none (avoids 404 noise in console)
   * @throws {400} If deviceId is missing
   * @throws {404} If shop not found
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

    const ticket = await ticketService.findActiveTicketByDevice(shop.id, deviceId);
    return ticket ?? null;
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
    try {
      const paramsSchema = z.object({
        id: z.coerce.number().int().positive(),
      });
      const { id } = validateRequest(paramsSchema, request.params);

      const ticket = await ticketService.getById(id);

      if (!ticket) {
        throw new NotFoundError(`Ticket with ID ${id} not found`);
      }

      return shapeTicketResponse(ticket as Record<string, unknown>);
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }
      request.log.error({ err, ticketId: (request.params as { id?: string })?.id }, 'GET /tickets/:id failed');
      throw new InternalError('Failed to load ticket. Please try again.');
    }
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
      scheduledTime: z.string().datetime().optional(),
    });

    const { id } = validateRequest(paramsSchema, request.params);
    const updates = validateRequest(bodySchema, request.body);

    const existingTicket = await ticketService.getById(id);
    if (!existingTicket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Reschedule appointment (pending only)
    if (updates.scheduledTime !== undefined) {
      const updated = await ticketService.rescheduleAppointment(id, updates.scheduledTime);
      return updated;
    }

    if (request.user?.role === 'barber' && updates.barberId !== undefined && updates.barberId !== null && updates.barberId !== request.user.barberId) {
      throw new ForbiddenError('Barbers can only assign tickets to themselves');
    }

    // Appointments: barbers cannot select/assign until at least 1 hour before the scheduled time
    const isAssigningBarber = updates.barberId !== undefined && updates.barberId !== null;
    const isStartingService = (updates.status ?? existingTicket.status) === 'in_progress';
    if (isAssigningBarber && isStartingService && (existingTicket as { type?: string }).type === 'appointment') {
      const scheduledTime = (existingTicket as { scheduledTime?: Date | string | null }).scheduledTime;
      if (scheduledTime) {
        const scheduled = new Date(scheduledTime).getTime();
        const oneHourBefore = scheduled - 60 * 60 * 1000;
        if (Date.now() < oneHourBefore) {
          throw new ValidationError('Cannot select this appointment yet. You can select it starting 1 hour before the scheduled time.');
        }
      }
    }

    // Use TicketService.updateStatus to ensure timestamps and audit logging are handled
    const updateData: UpdateTicketStatus = {
      status: updates.status ?? existingTicket.status,
    };
    if (updates.barberId !== undefined) {
      updateData.barberId = updates.barberId;
    }

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

    const existingTicket = await ticketService.getById(id);
    if (!existingTicket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Use shop already loaded by getById (with: { shop: true }) to avoid extra query
    const shopSettings = (existingTicket as { shop?: { settings: unknown } }).shop?.settings;
    const settings = parseSettings(shopSettings);

    const canCancel = existingTicket.status === 'waiting'
      || (settings.allowCustomerCancelInProgress && existingTicket.status === 'in_progress');

    if (!canCancel) {
      throw new Error('Only waiting tickets can be cancelled by customers');
    }

    const ticket = await ticketService.cancelWithExisting(existingTicket, 'Customer cancelled', 'customer');
    return ticket;
  });

  /**
   * Cancel a ticket (staff/owner/barber endpoint).
   * Barbers can cancel scheduled appointments (and any ticket) for their shop.
   *
   * @route DELETE /api/tickets/:id
   * @param id - Ticket ID
   * @returns Cancelled ticket
   * @throws {401} If not authenticated
   * @throws {403} If barber and ticket is from another shop
   * @throws {404} If ticket not found
   */
  fastify.delete('/tickets/:id', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff', 'barber'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const { id } = validateRequest(paramsSchema, request.params);

    const existingTicket = await ticketService.getById(id);
    if (!existingTicket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    if (request.user?.role === 'barber' && request.user.shopId != null && existingTicket.shopId !== request.user.shopId) {
      throw new ForbiddenError('Access denied to this ticket');
    }

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

