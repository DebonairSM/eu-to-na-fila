import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, gte, lt } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { requireAuth, requireRole, requireBarberShop } from '../middleware/auth.js';
import { getShopBySlug } from '../lib/shop.js';

/**
 * Analytics routes.
 * Provides detailed statistics for shop owners.
 */
export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get detailed analytics for a shop.
   * Requires owner authentication (only owners can view analytics).
   * 
   * @route GET /api/shops/:slug/analytics
   * @param slug - Shop slug identifier
   * @query days - Number of days to look back (default 7)
   * @returns Detailed analytics data
   * @throws {401} If not authenticated
   * @throws {403} If not owner
   */
  fastify.get('/shops/:slug/analytics', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const querySchema = z.object({
      days: z.coerce.number().int().min(0).max(3650).default(7), // 0 = all time
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { days } = validateRequest(querySchema, request.query);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const since = new Date();
    if (days > 0) {
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);
    } else {
      since.setTime(0);
    }
    const previousPeriodStart = new Date();
    if (days > 0) {
      previousPeriodStart.setDate(previousPeriodStart.getDate() - (days * 2));
      previousPeriodStart.setHours(0, 0, 0, 0);
    } else {
      previousPeriodStart.setTime(0);
    }

    // Get all tickets in the period
    const tickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shop.id),
        gte(schema.tickets.createdAt, since)
      ),
    });

    // Get tickets from previous period for comparison
    const previousPeriodTickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shop.id),
        gte(schema.tickets.createdAt, previousPeriodStart),
        lt(schema.tickets.createdAt, since),
      ),
    });
    const previousPeriodCount = previousPeriodTickets.length;

    // Get services for service breakdown
    const services = await db.query.services.findMany({
      where: eq(schema.services.shopId, shop.id),
    });
    const serviceMap = new Map(services.map(s => [s.id, s.name]));

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

    // Average per day (for all-time, use days since first ticket or 1)
    const dayCount = days > 0 ? days : (() => {
      const first = tickets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      if (!first || total === 0) return 1;
      const span = (Date.now() - first.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return Math.max(1, Math.ceil(span));
    })();
    const avgPerDay = Math.round(total / dayCount);

    // Calculate average service time (for completed tickets)
    // Use actual timestamps: completedAt - startedAt
    const completedTickets = tickets.filter(t => t.status === 'completed');
    let totalServiceTime = 0;
    let serviceTimeCount = 0;
    
    completedTickets.forEach(ticket => {
      // Use actual service duration: completedAt - startedAt
      if (ticket.completedAt && ticket.startedAt) {
        const serviceTime = (new Date(ticket.completedAt).getTime() - new Date(ticket.startedAt).getTime()) / (1000 * 60); // minutes
        if (serviceTime > 0 && serviceTime < 120) { // Reasonable range: 0-120 minutes
          totalServiceTime += serviceTime;
          serviceTimeCount++;
        }
      } else if (ticket.updatedAt && ticket.createdAt) {
        // Fallback to old calculation if new timestamps not available
        const serviceTime = (ticket.updatedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60); // minutes
        if (serviceTime > 0 && serviceTime < 120) {
          totalServiceTime += serviceTime;
          serviceTimeCount++;
        }
      }
    });
    
    const avgServiceTime = serviceTimeCount > 0 ? Math.round(totalServiceTime / serviceTimeCount) : 0;

    // Get barber stats
    const barbers = await db.query.barbers.findMany({
      where: eq(schema.barbers.shopId, shop.id),
    });

    const barberStats = barbers.map(barber => {
      const barberTickets = tickets.filter(t => t.barberId === barber.id);
      const barberCompleted = barberTickets.filter(t => t.status === 'completed');
      
      // Calculate average service time for this barber
      // Use actual timestamps: completedAt - startedAt
      let barberTotalServiceTime = 0;
      let barberServiceTimeCount = 0;
      
      barberCompleted.forEach(ticket => {
        if (ticket.completedAt && ticket.startedAt) {
          const serviceTime = (new Date(ticket.completedAt).getTime() - new Date(ticket.startedAt).getTime()) / (1000 * 60); // minutes
          if (serviceTime > 0 && serviceTime < 120) {
            barberTotalServiceTime += serviceTime;
            barberServiceTimeCount++;
          }
        } else if (ticket.updatedAt && ticket.createdAt) {
          // Fallback to old calculation if new timestamps not available
          const serviceTime = (ticket.updatedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60); // minutes
          if (serviceTime > 0 && serviceTime < 120) {
            barberTotalServiceTime += serviceTime;
            barberServiceTimeCount++;
          }
        }
      });
      
      const barberAvgServiceTime = barberServiceTimeCount > 0 
        ? Math.round(barberTotalServiceTime / barberServiceTimeCount) 
        : 0;
      
      return {
        id: barber.id,
        name: barber.name,
        totalServed: barberCompleted.length,
        avgServiceTime: barberAvgServiceTime,
        isPresent: barber.isPresent,
      };
    });

    // Peak hours and hourly distribution
    const hourCounts: Record<number, number> = {};
    tickets.forEach(t => {
      const hour = t.createdAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0];

    // Hourly distribution (all 24 hours)
    const hourlyDistribution: Record<number, number> = {};
    for (let h = 0; h < 24; h++) {
      hourlyDistribution[h] = hourCounts[h] || 0;
    }

    // Service breakdown
    const serviceCounts: Record<number, number> = {};
    tickets.forEach(t => {
      serviceCounts[t.serviceId] = (serviceCounts[t.serviceId] || 0) + 1;
    });
    const serviceBreakdown = Object.entries(serviceCounts)
      .map(([serviceId, count]) => ({
        serviceId: parseInt(serviceId),
        serviceName: serviceMap.get(parseInt(serviceId)) || `Service ${serviceId}`,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Day of week distribution
    const dayOfWeekDistribution: Record<string, number> = {
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0,
      'Sunday': 0,
    };
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    tickets.forEach(t => {
      const dayIndex = t.createdAt.getDay();
      const dayName = dayNames[dayIndex];
      dayOfWeekDistribution[dayName]++;
    });

    // Wait time trends (average actual wait time per day)
    // Use actual wait time: startedAt - createdAt (for completed/in_progress tickets)
    const waitTimeByDay: Record<string, { total: number; count: number }> = {};
    tickets.forEach(t => {
      let actualWaitTime: number | null = null;
      
      // Use actual wait time if available (startedAt - createdAt)
      if (t.startedAt && t.createdAt) {
        actualWaitTime = (new Date(t.startedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60); // minutes
        if (actualWaitTime < 0 || actualWaitTime > 480) { // Reasonable range: 0-8 hours
          actualWaitTime = null;
        }
      }
      
      // Fallback to estimated wait time if actual not available
      if (actualWaitTime === null && t.estimatedWaitTime !== null && t.estimatedWaitTime !== undefined) {
        actualWaitTime = t.estimatedWaitTime;
      }
      
      if (actualWaitTime !== null) {
        const day = t.createdAt.toISOString().split('T')[0];
        if (!waitTimeByDay[day]) {
          waitTimeByDay[day] = { total: 0, count: 0 };
        }
        waitTimeByDay[day].total += actualWaitTime;
        waitTimeByDay[day].count++;
      }
    });
    const waitTimeTrends: Record<string, number> = {};
    Object.entries(waitTimeByDay).forEach(([day, data]) => {
      waitTimeTrends[day] = data.count > 0 ? Math.round(data.total / data.count) : 0;
    });

    // Cancellation analysis
    const cancelledTickets = tickets.filter(t => t.status === 'cancelled');
    const cancellationRateByDay: Record<string, { cancelled: number; total: number }> = {};
    const cancellationRateByHour: Record<number, { cancelled: number; total: number }> = {};
    let totalCancellationTime = 0;
    let cancellationTimeCount = 0;

    tickets.forEach(t => {
      const dayName = dayNames[t.createdAt.getDay()];
      const hour = t.createdAt.getHours();
      
      if (!cancellationRateByDay[dayName]) {
        cancellationRateByDay[dayName] = { cancelled: 0, total: 0 };
      }
      if (!cancellationRateByHour[hour]) {
        cancellationRateByHour[hour] = { cancelled: 0, total: 0 };
      }
      
      cancellationRateByDay[dayName].total++;
      cancellationRateByHour[hour].total++;
      
        if (t.status === 'cancelled') {
        cancellationRateByDay[dayName].cancelled++;
        cancellationRateByHour[hour].cancelled++;
        
        // Use actual cancellation time: cancelledAt - createdAt
        if (t.cancelledAt && t.createdAt) {
          const timeBeforeCancellation = (new Date(t.cancelledAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60);
          if (timeBeforeCancellation > 0 && timeBeforeCancellation < 240) {
            totalCancellationTime += timeBeforeCancellation;
            cancellationTimeCount++;
          }
        } else if (t.updatedAt && t.createdAt) {
          // Fallback to old calculation if new timestamps not available
          const timeBeforeCancellation = (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60);
          if (timeBeforeCancellation > 0 && timeBeforeCancellation < 240) {
            totalCancellationTime += timeBeforeCancellation;
            cancellationTimeCount++;
          }
        }
      }
    });

    const cancellationAnalysis = {
      rateByDay: Object.fromEntries(
        Object.entries(cancellationRateByDay).map(([day, data]) => [
          day,
          data.total > 0 ? Math.round((data.cancelled / data.total) * 100) : 0,
        ])
      ),
      rateByHour: Object.fromEntries(
        Object.entries(cancellationRateByHour).map(([hour, data]) => [
          parseInt(hour),
          data.total > 0 ? Math.round((data.cancelled / data.total) * 100) : 0,
        ])
      ),
      avgTimeBeforeCancellation: cancellationTimeCount > 0 
        ? Math.round(totalCancellationTime / cancellationTimeCount) 
        : 0,
    };

    // Service time distribution (histogram)
    // Use actual timestamps: completedAt - startedAt
    const serviceTimeDistribution: Record<string, number> = {
      '0-10': 0,
      '10-20': 0,
      '20-30': 0,
      '30-45': 0,
      '45-60': 0,
      '60+': 0,
    };
    completedTickets.forEach(ticket => {
      let serviceTime: number | null = null;
      if (ticket.completedAt && ticket.startedAt) {
        serviceTime = (new Date(ticket.completedAt).getTime() - new Date(ticket.startedAt).getTime()) / (1000 * 60);
      } else if (ticket.updatedAt && ticket.createdAt) {
        // Fallback to old calculation if new timestamps not available
        serviceTime = (ticket.updatedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60);
      }
      
      if (serviceTime !== null && serviceTime > 0 && serviceTime < 120) {
        if (serviceTime < 10) serviceTimeDistribution['0-10']++;
        else if (serviceTime < 20) serviceTimeDistribution['10-20']++;
        else if (serviceTime < 30) serviceTimeDistribution['20-30']++;
        else if (serviceTime < 45) serviceTimeDistribution['30-45']++;
        else if (serviceTime < 60) serviceTimeDistribution['45-60']++;
        else serviceTimeDistribution['60+']++;
      }
    });

    // Barber efficiency (tickets per day, completion rate)
    const barberEfficiency = barbers.map(barber => {
      const barberTickets = tickets.filter(t => t.barberId === barber.id);
      const barberCompleted = barberTickets.filter(t => t.status === 'completed');
      const ticketsPerDay = dayCount > 0 ? Math.round(barberTickets.length / dayCount * 10) / 10 : 0;
      const barberCompletionRate = barberTickets.length > 0 
        ? Math.round((barberCompleted.length / barberTickets.length) * 100) 
        : 0;
      
      return {
        id: barber.id,
        name: barber.name,
        ticketsPerDay,
        completionRate: barberCompletionRate,
      };
    });

    // Trends
    const weekOverWeek = previousPeriodCount > 0 
      ? Math.round(((total - previousPeriodCount) / previousPeriodCount) * 100) 
      : 0;
    
    // Last 7 days comparison
    const last7DaysComparison: Array<{ day: string; change: number }> = [];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });
    
    last7Days.forEach(day => {
      const dayTickets = tickets.filter(t => t.createdAt.toISOString().split('T')[0] === day).length;
      const previousDay = new Date(day);
      previousDay.setDate(previousDay.getDate() - 7);
      const previousDayStr = previousDay.toISOString().split('T')[0];
      const previousDayTickets = previousPeriodTickets.filter(t => 
        t.createdAt.toISOString().split('T')[0] === previousDayStr
      ).length;
      
      const change = previousDayTickets > 0 
        ? Math.round(((dayTickets - previousDayTickets) / previousDayTickets) * 100) 
        : (dayTickets > 0 ? 100 : 0);
      
      last7DaysComparison.push({
        day,
        change,
      });
    });

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
        avgServiceTime,
      },
      barbers: barberStats,
      ticketsByDay,
      hourlyDistribution,
      peakHour: peakHour ? { hour: parseInt(peakHour[0]), count: peakHour[1] } : null,
      serviceBreakdown,
      dayOfWeekDistribution,
      waitTimeTrends,
      cancellationAnalysis,
      serviceTimeDistribution,
      barberEfficiency,
      trends: {
        weekOverWeek,
        last7DaysComparison,
      },
    };
  });

  /**
   * Get analytics for the authenticated barber only.
   * Requires barber authentication; barber must belong to the shop.
   *
   * @route GET /api/shops/:slug/analytics/me
   * @query days - Number of days to look back (default 7)
   */
  fastify.get('/shops/:slug/analytics/me', {
    preHandler: [
      requireAuth(),
      requireRole(['barber']),
      requireBarberShop(async (request) => {
        const slug = (request.params as { slug: string }).slug;
        const shop = await getShopBySlug(slug);
        if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);
        return shop.id;
      }),
    ],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const querySchema = z.object({
      days: z.coerce.number().int().min(0).max(3650).default(7),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { days } = validateRequest(querySchema, request.query);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const barberId = request.user!.barberId!;

    const since = new Date();
    if (days > 0) {
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);
    } else {
      since.setTime(0);
    }

    const tickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shop.id),
        eq(schema.tickets.barberId, barberId),
        gte(schema.tickets.createdAt, since)
      ),
    });

    const services = await db.query.services.findMany({
      where: eq(schema.services.shopId, shop.id),
    });
    const serviceMap = new Map(services.map(s => [s.id, s]));
    const serviceNameMap = new Map(services.map(s => [s.id, s.name]));

    const total = tickets.length;
    const completed = tickets.filter(t => t.status === 'completed');
    const cancelled = tickets.filter(t => t.status === 'cancelled');
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    const cancellationRate = total > 0 ? Math.round((cancelled.length / total) * 100) : 0;

    const dayCount = days > 0 ? days : Math.max(1, Math.ceil((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24)));
    const avgPerDay = Math.round(total / dayCount * 10) / 10;

    let totalServiceTime = 0;
    let serviceTimeCount = 0;
    completed.forEach(ticket => {
      if (ticket.completedAt && ticket.startedAt) {
        const mins = (new Date(ticket.completedAt).getTime() - new Date(ticket.startedAt).getTime()) / (1000 * 60);
        if (mins > 0 && mins < 120) {
          totalServiceTime += mins;
          serviceTimeCount++;
        }
      }
    });
    const avgServiceTime = serviceTimeCount > 0 ? Math.round(totalServiceTime / serviceTimeCount) : 0;

    let revenueCents = 0;
    completed.forEach(ticket => {
      const svc = serviceMap.get(ticket.serviceId);
      if (svc?.price != null) revenueCents += svc.price;
    });

    const ticketsByDay: Record<string, number> = {};
    tickets.forEach(t => {
      const day = t.createdAt.toISOString().split('T')[0];
      ticketsByDay[day] = (ticketsByDay[day] || 0) + 1;
    });

    const serviceCounts: Record<number, number> = {};
    tickets.forEach(t => {
      serviceCounts[t.serviceId] = (serviceCounts[t.serviceId] || 0) + 1;
    });
    const serviceBreakdown = Object.entries(serviceCounts)
      .map(([serviceId, count]) => ({
        serviceId: parseInt(serviceId),
        serviceName: serviceNameMap.get(parseInt(serviceId)) || `Service ${serviceId}`,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekDistribution: Record<string, number> = Object.fromEntries(dayNames.map(d => [d, 0]));
    tickets.forEach(t => {
      const dayName = dayNames[t.createdAt.getDay()];
      dayOfWeekDistribution[dayName]++;
    });

    return {
      period: {
        days,
        since: since.toISOString(),
        until: new Date().toISOString(),
      },
      summary: {
        total,
        completed: completed.length,
        cancelled: cancelled.length,
        completionRate,
        cancellationRate,
        avgPerDay,
        avgServiceTime,
        revenueCents,
      },
      ticketsByDay,
      serviceBreakdown,
      dayOfWeekDistribution,
    };
  });
};

