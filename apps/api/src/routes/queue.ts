import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, asc } from 'drizzle-orm';
import { ticketService } from '../services/TicketService.js';
import { queueService } from '../services/QueueService.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getShopBySlug } from '../lib/shop.js';

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

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

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

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    // Get metrics using service
    const metrics = await queueService.getMetrics(shop.id);

    return metrics;
  });

  /**
   * Diagnostic: expose current wait-time inputs for debugging.
   *
   * @route GET /api/shops/:slug/wait-debug
   * @returns { peopleAhead, activePresentBarbers, inProgressRemaining, sampleEstimateForNext }
   */
  fastify.get('/shops/:slug/wait-debug', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const { slug } = validateRequest(paramsSchema, request.params);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    // General line only (no preferred barber or preferred barber inactive)
    const metrics = await queueService.getMetrics(shop.id);
    const peopleAhead = metrics.queueLength;

    // Active & present barbers
    const activeBarbers = await db.query.barbers.findMany({
      where: and(
        eq(schema.barbers.shopId, shop.id),
        eq(schema.barbers.isActive, true),
        eq(schema.barbers.isPresent, true)
      ),
    });
    const activePresentBarbers = Math.max(activeBarbers.length, 1);

    // In-progress remaining
    const now = new Date();
    const inProgressTickets = await db.query.tickets.findMany({
      where: and(eq(schema.tickets.shopId, shop.id), eq(schema.tickets.status, 'in_progress')),
      orderBy: [asc(schema.tickets.updatedAt)],
    });
    const inProgressRemaining = inProgressTickets.reduce((sum, t) => {
      const updatedAt = t.updatedAt ? new Date(t.updatedAt) : now;
      const elapsedMinutes = Math.max(0, (now.getTime() - updatedAt.getTime()) / 60000);
      const remaining = Math.max(0, 20 - elapsedMinutes);
      return sum + remaining;
    }, 0);

    const sampleEstimateForNext = Math.ceil(
      Math.max(0, (peopleAhead * 20) / activePresentBarbers) + inProgressRemaining
    );

    return {
      peopleAhead,
      activePresentBarbers,
      inProgressRemaining,
      sampleEstimateForNext,
    };
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

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    // Get statistics using service
    const statistics = await ticketService.getStatistics(
      shop.id,
      since ? new Date(since) : undefined
    );

    return statistics;
  });

  /**
   * Get wait times for standard queue and all barbers.
   * 
   * @route GET /api/shops/:slug/wait-times
   * @param slug - Shop slug identifier
   * @returns Wait times for standard queue and each barber
   * @throws {404} If shop not found
   */
  fastify.get('/shops/:slug/wait-times', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const { slug } = validateRequest(paramsSchema, request.params);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const now = new Date();

    // Get all active barbers
    const barbers = await db.query.barbers.findMany({
      where: and(
        eq(schema.barbers.shopId, shop.id),
        eq(schema.barbers.isActive, true)
      ),
    });

    // Calculate wait time for each barber
    const barberWaitTimes = await Promise.all(
      barbers.map(async (barber) => {
        const position = await queueService.calculatePositionForPreferredBarber(
          shop.id,
          barber.id,
          now
        );
        const waitTime = await queueService.calculateWaitTimeForPreferredBarber(
          shop.id,
          barber.id,
          position,
          now
        );

        return {
          barberId: barber.id,
          barberName: barber.name,
          waitTime,
          isPresent: barber.isPresent,
        };
      })
    );

    // Standard queue wait time should be the minimum of all present barbers' wait times
    // because the standard queue can assign to any available barber (the fastest one)
    const presentBarberWaitTimes = barberWaitTimes
      .filter((bt) => bt.isPresent && bt.waitTime !== null)
      .map((bt) => bt.waitTime as number);
    
    const standardWaitTime = presentBarberWaitTimes.length > 0
      ? Math.min(...presentBarberWaitTimes)
      : null;

    return {
      standardWaitTime,
      barberWaitTimes,
    };
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

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    await ticketService.recalculateShopQueue(shop.id);
    return { ok: true };
  });
};

