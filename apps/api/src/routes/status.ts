import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { updateTicketStatusSchema } from '@eutonafila/shared';
import { ticketService } from '../services/index.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

/**
 * Status routes.
 * Handles ticket status updates.
 */
export const statusRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Update ticket status.
   * Requires staff or owner authentication.
   * 
   * @route PATCH /api/tickets/:id/status
   * @param id - Ticket ID
   * @body status - New status (waiting, in_progress, completed, cancelled)
   * @body barberId - Barber ID (optional, required for in_progress)
   * @returns Updated ticket
   * @throws {401} If not authenticated
   * @throws {404} If ticket or barber not found
   * @throws {400} If validation fails
   * @throws {409} If status transition is invalid
   */
  fastify.patch('/tickets/:id/status', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff'])],
  }, async (request, reply) => {
    // Validate params
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const { id } = validateRequest(paramsSchema, request.params);

    // Validate body
    const data = validateRequest(updateTicketStatusSchema, request.body);

    // Get existing ticket (for validation)
    const existingTicket = await ticketService.getById(id);
    if (!existingTicket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    if (request.user?.shopId != null && existingTicket.shopId !== request.user.shopId) {
      throw new ForbiddenError('Access denied to this ticket');
    }

    // Update status using service (includes validation and queue recalculation)
    const ticket = await ticketService.updateStatus(id, data);

    return ticket;
  });
};

