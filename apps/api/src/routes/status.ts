import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { updateTicketStatusSchema } from '@eutonafila/shared';
import { ticketService } from '../services/TicketService.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';

/**
 * Status routes.
 * Handles ticket status updates.
 */
export const statusRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Update ticket status.
   * 
   * @route PATCH /api/tickets/:id/status
   * @param id - Ticket ID
   * @body status - New status (waiting, in_progress, completed, cancelled)
   * @body barberId - Barber ID (optional, required for in_progress)
   * @returns Updated ticket
   * @throws {404} If ticket or barber not found
   * @throws {400} If validation fails
   * @throws {409} If status transition is invalid
   */
  fastify.patch('/tickets/:id/status', async (request, reply) => {
    // Validate params
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const { id } = validateRequest(paramsSchema, request.params);

    // Validate body
    const data = validateRequest(updateTicketStatusSchema, request.body);

    // Get existing ticket (for previous status and shop slug)
    const existingTicket = await ticketService.getById(id);
    if (!existingTicket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    const previousStatus = existingTicket.status;

    // Update status using service (includes validation and queue recalculation)
    const ticket = await ticketService.updateStatus(id, data);

    return ticket;
  });
};

