import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { updateTicketStatusSchema } from '@eutonafila/shared';
import type { WebSocketEvent } from '@eutonafila/shared';

export const statusRoutes: FastifyPluginAsync = async (fastify) => {
  // PATCH /api/tickets/:id/status - Update ticket status
  fastify.patch('/tickets/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };

    const validation = updateTicketStatusSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({ error: validation.error });
    }

    const [ticket] = await db
      .update(schema.tickets)
      .set({
        status: validation.data.status,
        barberId: validation.data.barberId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.tickets.id, parseInt(id)))
      .returning();

    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    // Get shop slug for WebSocket broadcast
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.id, ticket.shopId),
    });

    // Broadcast WebSocket event
    const event: WebSocketEvent = {
      type: 'ticket.status.changed',
      shopId: shop?.slug || '',
      timestamp: new Date().toISOString(),
      data: ticket,
    };

    // Broadcast to all connected WebSocket clients
    (fastify as any).broadcast(event);

    return ticket;
  });
};

