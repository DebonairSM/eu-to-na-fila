import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';

/**
 * Analytics routes.
 * Provides detailed statistics for shop owners.
 */
export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get detailed analytics for a shop.
   * Requires PIN verification (done on frontend).
   * 
   * @route GET /api/shops/:slug/analytics
   * @param slug - Shop slug identifier
   * @query days - Number of days to look back (default 7)
   * @returns Detailed analytics data
   */
  fastify.get('/shops/:slug/analytics', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const querySchema = z.object({
      days: z.coerce.number().int().min(1).max(90).default(7),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { days } = validateRequest(querySchema, request.query);

    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all tickets in the period
    const tickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shop.id),
        gte(schema.tickets.createdAt, since)
      ),
    });

    // Calculate statistics
    const total = tickets.length;
    const completed = tickets.filter(t => t.status === 'completed').length;
    const cancelled = tickets.filter(t => t.status === 'cancelled').length;
    const waiting = tickets.filter(t => t.status === 'waiting').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;

    // Completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    // Tickets by day
    const ticketsByDay: Record<string, number> = {};
    tickets.forEach(t => {
      const day = t.createdAt.toISOString().split('T')[0];
      ticketsByDay[day] = (ticketsByDay[day] || 0) + 1;
    });

    // Average per day
    const avgPerDay = days > 0 ? Math.round(total / days) : 0;

    // Get barber stats
    const barbers = await db.query.barbers.findMany({
      where: eq(schema.barbers.shopId, shop.id),
    });

    const barberStats = barbers.map(barber => {
      const barberTickets = tickets.filter(t => t.barberId === barber.id);
      const barberCompleted = barberTickets.filter(t => t.status === 'completed').length;
      return {
        id: barber.id,
        name: barber.name,
        totalServed: barberCompleted,
        isPresent: barber.isPresent,
      };
    });

    // Peak hours (simplified - just count by hour)
    const hourCounts: Record<number, number> = {};
    tickets.forEach(t => {
      const hour = t.createdAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      period: {
        days,
        since: since.toISOString(),
        until: new Date().toISOString(),
      },
      summary: {
        total,
        completed,
        cancelled,
        waiting,
        inProgress,
        completionRate,
        cancellationRate,
        avgPerDay,
      },
      barbers: barberStats,
      ticketsByDay,
      peakHour: peakHour ? { hour: parseInt(peakHour[0]), count: peakHour[1] } : null,
    };
  });
};

