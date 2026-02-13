import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { ticketService, queueService } from '../services/index.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getShopBySlug } from '../lib/shop.js';
import { shapeTicketResponse } from '../lib/ticketResponse.js';
import { parseSettings } from '../lib/settings.js';

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

    const settings = parseSettings(shop.settings);
    const tickets = await ticketService.getByShop(shop.id, undefined, settings);

    return {
      shop,
      tickets: tickets.map((t) => shapeTicketResponse(t as Record<string, unknown>)),
    };
  });

  /**
   * Get next ticket to serve (weighted order when allowAppointments). Auth optional for public lobby.
   * @route GET /api/shops/:slug/queue/next
   */
  fastify.get('/shops/:slug/queue/next', async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const settings = parseSettings(shop.settings);
    const { next, deadZoneWarning } = await queueService.getNextTicket(shop.id, settings);

    return {
      next: next ? shapeTicketResponse(next) : null,
      deadZoneWarning: deadZoneWarning ?? undefined,
    };
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

    // Build per-barber availability (minutes until free) using actual service durations
    const now = new Date();
    const inProgressTickets = await db.query.tickets.findMany({
      where: and(eq(schema.tickets.shopId, shop.id), eq(schema.tickets.status, 'in_progress')),
      orderBy: [asc(schema.tickets.updatedAt)],
    });
    const inProgressWithBarbers = inProgressTickets.filter(t => t.barberId !== null);

    // Also get waiting tickets in general line for the simulation
    const generalWaiting = await db.query.tickets.findMany({
      where: and(eq(schema.tickets.shopId, shop.id), eq(schema.tickets.status, 'waiting')),
      orderBy: [asc(schema.tickets.createdAt)],
    });

    // Pre-load service durations
    const serviceIds = new Set<number>();
    for (const t of inProgressWithBarbers) serviceIds.add(t.serviceId);
    for (const t of generalWaiting) serviceIds.add(t.serviceId);
    const durationMap = new Map<number, number>();
    if (serviceIds.size > 0) {
      const svcs = await db.query.services.findMany({
        where: inArray(schema.services.id, [...serviceIds]),
      });
      for (const s of svcs) durationMap.set(s.id, s.duration);
    }

    // Pre-load per-barber weekday stats for barber-aware duration lookups
    const barberIds = activeBarbers.map((b) => b.id);
    const todayDow = now.getDay();
    const barberStatsMap = new Map<string, number>();
    if (barberIds.length > 0 && serviceIds.size > 0) {
      const stats = await db.query.barberServiceWeekdayStats.findMany({
        where: and(
          eq(schema.barberServiceWeekdayStats.dayOfWeek, todayDow),
          inArray(schema.barberServiceWeekdayStats.barberId, barberIds),
          inArray(schema.barberServiceWeekdayStats.serviceId, [...serviceIds]),
        ),
      });
      for (const s of stats) {
        if (s.totalCompleted >= 10) {
          barberStatsMap.set(`${s.barberId}:${s.serviceId}`, s.avgDuration);
        }
      }
    }

    const getDuration = (serviceId: number, barberId?: number) => {
      if (barberId) {
        const avg = barberStatsMap.get(`${barberId}:${serviceId}`);
        if (avg !== undefined) return avg;
      }
      return durationMap.get(serviceId) ?? 20;
    };

    const barberAvailability: number[] = [];
    for (const barber of activeBarbers) {
      const ip = inProgressWithBarbers.find(t => t.barberId === barber.id);
      if (ip) {
        const startTime = ip.startedAt ? new Date(ip.startedAt) :
                          ip.updatedAt ? new Date(ip.updatedAt) : now;
        const elapsed = Math.max(0, (now.getTime() - startTime.getTime()) / 60000);
        barberAvailability.push(Math.max(0, getDuration(ip.serviceId, barber.id) - elapsed));
      } else {
        barberAvailability.push(0);
      }
    }
    if (barberAvailability.length === 0) barberAvailability.push(0);

    // Simulate wave-based assignment using barber-aware service durations
    const simAvailability = [...barberAvailability];
    for (let i = 0; i < peopleAhead && i < generalWaiting.length; i++) {
      const minTime = Math.min(...simAvailability);
      const minIdx = simAvailability.indexOf(minTime);
      const barberId = activeBarbers[minIdx]?.id;
      simAvailability[minIdx] += getDuration(generalWaiting[i].serviceId, barberId);
    }
    const sampleEstimateForNext = Math.ceil(Math.min(...simAvailability));

    const inProgressRemaining = barberAvailability.reduce((sum, v) => sum + v, 0);

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
    const settings = parseSettings(shop.settings);

    // Standard queue: "if the next customer joins the general line now, what's their wait?"
    // When allowAppointments, include only at-risk pending appointments in the estimate.
    const standardWaitTime = settings.allowAppointments
      ? await queueService.calculateStandardWaitTimeIncludingAtRiskAppointments(shop.id, settings)
      : await queueService.calculateWaitTime(
          shop.id,
          await queueService.calculatePosition(shop.id, now),
          settings.defaultServiceDuration
        );

    // Get all active barbers for per-barber wait times (for barber-specific display if needed)
    const barbers = await db.query.barbers.findMany({
      where: and(
        eq(schema.barbers.shopId, shop.id),
        eq(schema.barbers.isActive, true)
      ),
    });

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

