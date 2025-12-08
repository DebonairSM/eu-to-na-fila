import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { ticketService } from '../services/TicketService.js';
import { queueService } from '../services/QueueService.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

/**
 * Queue routes.
 * Handles queue viewing and metrics.
 */
export const queueRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get current queue for a shop.
   * 
   * @route GET /api/shops/:slug/queue
   * @param slug - Shop slug identifier
   * @returns Shop details and all tickets
   * @throws {404} If shop not found
   */
  fastify.get('/shops/:slug/queue', async (request, reply) => {
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

    // Get tickets using service
    const tickets = await ticketService.getByShop(shop.id);

    return { shop, tickets };
  });

  /**
   * Get queue metrics for a shop.
   * 
   * @route GET /api/shops/:slug/metrics
   * @param slug - Shop slug identifier
   * @returns Queue metrics (length, wait time, active barbers)
   * @throws {404} If shop not found
   */
  fastify.get('/shops/:slug/metrics', async (request, reply) => {
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

    // Get metrics using service
    const metrics = await queueService.getMetrics(shop.id);

    return metrics;
  });

  /**
   * Get statistics for a shop.
   * 
   * @route GET /api/shops/:slug/statistics
   * @param slug - Shop slug identifier
   * @query since - Optional start date for statistics (ISO string)
   * @returns Ticket statistics
   * @throws {404} If shop not found
   */
  fastify.get('/shops/:slug/statistics', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const querySchema = z.object({
      since: z.string().datetime().optional(),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { since } = validateRequest(querySchema, request.query);

    // Get shop
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    // Get statistics using service
    const statistics = await ticketService.getStatistics(
      shop.id,
      since ? new Date(since) : undefined
    );

    return statistics;
  });

  /**
   * Recalculate positions and wait times for a shop (owner only).
   *
   * @route POST /api/shops/:slug/recalculate
   */
  fastify.post('/shops/:slug/recalculate', {
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

    await ticketService.recalculateShopQueue(shop.id);
    return { ok: true };
  });
};

