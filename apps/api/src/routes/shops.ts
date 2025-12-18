import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db/index.js';

/**
 * Shop routes.
 * Handles shop listing.
 */
export const shopsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get all shops.
   * 
   * @route GET /api/shops
   * @returns Array of shops (public fields only)
   */
  fastify.get('/shops', async (request, reply) => {
    // Get all shops
    const shops = await db.query.shops.findMany({
      orderBy: (shops, { asc }) => [asc(shops.name)],
    });

    // Return only public fields (exclude sensitive data)
    return shops.map((shop) => ({
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      domain: shop.domain,
      createdAt: shop.createdAt,
    }));
  });
};

