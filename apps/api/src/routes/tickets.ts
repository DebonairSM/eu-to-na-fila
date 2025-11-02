import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { createTicketSchema } from '@eutonafila/shared';
import type { WebSocketEvent } from '@eutonafila/shared';

export const ticketRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/shops/:slug/tickets - Join queue
  fastify.post('/shops/:slug/tickets', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      return reply.status(404).send({ error: 'Shop not found' });
    }

    const validation = createTicketSchema.safeParse({
      ...request.body,
      shopId: shop.id,
    });

    if (!validation.success) {
      return reply.status(400).send({ error: validation.error });
    }

    // Calculate position in queue
    const waitingTickets = await db.query.tickets.findMany({
      where: eq(schema.tickets.status, 'waiting'),
    });

    const [ticket] = await db
      .insert(schema.tickets)
      .values({
        ...validation.data,
        status: 'waiting',
        position: waitingTickets.length + 1,
      })
      .returning();

    // Broadcast WebSocket event
    const event: WebSocketEvent = {
      type: 'ticket.created',
      shopId: slug,
      timestamp: new Date().toISOString(),
      data: ticket,
    };

    // Broadcast to all clients in this shop's room
    fastify.websocketServer.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(event));
      }
    });

    return ticket;
  });
};

