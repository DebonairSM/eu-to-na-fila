import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

export const queueRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/shops/:slug/queue - Get current queue for a shop
  fastify.get('/shops/:slug/queue', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      return reply.status(404).send({ error: 'Shop not found' });
    }

    const tickets = await db.query.tickets.findMany({
      where: eq(schema.tickets.shopId, shop.id),
      with: {
        service: true,
        barber: true,
      },
    });

    return { shop, tickets };
  });
};

