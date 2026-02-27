import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { toZonedTime } from 'date-fns-tz';
import { db, schema } from '../db/index.js';
import { eq, and, gte, lt, inArray, isNotNull, desc, sql } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { requireAuth, requireRole, requireBarberShop } from '../middleware/auth.js';
import { getShopBySlug } from '../lib/shop.js';
import { parseSettings } from '../lib/settings.js';

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
      days: z.coerce.number().int().min(0).max(3650).optional(),
      since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const raw = validateRequest(querySchema, request.query);
    const useRange = raw.since != null && raw.until != null;
    const days = useRange ? undefined : (raw.days ?? 7);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    let since: Date;
    let until: Date;
    let periodDays: number;
    let previousPeriodStart: Date;

    if (useRange && raw.since != null && raw.until != null) {
      since = new Date(raw.since + 'T00:00:00.000Z');
      until = new Date(raw.until + 'T00:00:00.000Z');
      until.setUTCDate(until.getUTCDate() + 1);
      periodDays = Math.max(1, Math.ceil((until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24)));
      previousPeriodStart = new Date(since);
      previousPeriodStart.setUTCDate(previousPeriodStart.getUTCDate() - periodDays);
    } else {
      const d = days ?? 7;
      since = new Date();
      if (d > 0) {
        since.setDate(since.getDate() - d);
        since.setHours(0, 0, 0, 0);
      } else {
        since.setTime(0);
      }
      until = new Date();
      periodDays = d;
      previousPeriodStart = new Date();
      if (d > 0) {
        previousPeriodStart.setDate(previousPeriodStart.getDate() - (d * 2));
        previousPeriodStart.setHours(0, 0, 0, 0);
      } else {
        previousPeriodStart.setTime(0);
      }
    }

    const ticketConditions = useRange
      ? and(
          eq(schema.tickets.shopId, shop.id),
          gte(schema.tickets.createdAt, since),
          lt(schema.tickets.createdAt, until)
        )
      : and(
          eq(schema.tickets.shopId, shop.id),
          gte(schema.tickets.createdAt, since)
        );

    // Get all tickets in the period
    const tickets = await db.query.tickets.findMany({
      where: ticketConditions,
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

    // Get services for service breakdown and revenue (omit sort_order for DBs before migration 0022)
    const services = await db.query.services.findMany({
      where: eq(schema.services.shopId, shop.id),
      columns: schema.serviceColumnsWithoutSortOrder,
    });
    const serviceMap = new Map(services.map(s => [s.id, s.name]));
    const servicePriceMap = new Map(services.map(s => [s.id, s.price]));

    // Calculate statistics (all five statuses so total = completed + cancelled + waiting + inProgress + pending)
    const total = tickets.length;
    const completed = tickets.filter(t => t.status === 'completed').length;
    const cancelled = tickets.filter(t => t.status === 'cancelled').length;
    const waiting = tickets.filter(t => t.status === 'waiting').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const pending = tickets.filter(t => t.status === 'pending').length;

    // Completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    // Tickets by day
    const ticketsByDay: Record<string, number> = {};
    tickets.forEach(t => {
      const day = t.createdAt.toISOString().split('T')[0];
      ticketsByDay[day] = (ticketsByDay[day] || 0) + 1;
    });

    // Average per day (for all-time, use days since first ticket or 1; for custom range use periodDays)
    const dayCount = useRange
      ? periodDays
      : (days !== undefined && days > 0 ? days : (() => {
          const first = tickets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
          if (!first || total === 0) return 1;
          const span = (Date.now() - first.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return Math.max(1, Math.ceil(span));
        })());
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

    // Revenue (owner analytics: sum of service prices for completed tickets)
    let revenueCents = 0;
    const revenueByDay: Record<string, number> = {};
    completedTickets.forEach(ticket => {
      const price = servicePriceMap.get(ticket.serviceId);
      if (price != null) {
        revenueCents += price;
        const day = ticket.createdAt.toISOString().split('T')[0];
        revenueByDay[day] = (revenueByDay[day] || 0) + price;
      }
    });

    const settings = parseSettings(shop.settings);

    // Day of week in shop timezone (for consistency with hourly distribution)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

    // Get barber stats
    const barbers = await db.query.barbers.findMany({
      where: eq(schema.barbers.shopId, shop.id),
    });

    // Current month range for avgWorkTimeMinutesSinceMonthStart (UTC)
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
    const daysElapsedThisMonth = Math.max(1, now.getUTCDate());
    const monthTickets =
      daysElapsedThisMonth >= 1
        ? await db.query.tickets.findMany({
            where: and(
              eq(schema.tickets.shopId, shop.id),
              eq(schema.tickets.status, 'completed'),
              isNotNull(schema.tickets.completedAt),
              gte(schema.tickets.completedAt, monthStart),
              lt(schema.tickets.completedAt, todayEnd)
            ),
            columns: { barberId: true, completedAt: true, startedAt: true, status: true },
          })
        : [];
    const monthCompletedByBarber = new Map<number, number>();
    monthTickets
      .filter((t): t is typeof t & { completedAt: Date; startedAt: Date } => t.status === 'completed' && t.completedAt != null && t.startedAt != null)
      .forEach((t) => {
        const mins = (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / (1000 * 60);
        if (mins > 0 && mins < 120 && t.barberId != null) {
          monthCompletedByBarber.set(t.barberId, (monthCompletedByBarber.get(t.barberId) ?? 0) + mins);
        }
      });

    const barberStats = barbers.map(barber => {
      const barberTickets = tickets.filter(t => t.barberId === barber.id);
      const barberCompleted = barberTickets.filter(t => t.status === 'completed');
      
      // Calculate average service time and total activity time for this barber
      // Use actual timestamps: completedAt - startedAt (cap 0-120 min per ticket)
      let barberTotalServiceTime = 0;
      let barberServiceTimeCount = 0;
      let totalActivityMinutes = 0;
      
      barberCompleted.forEach(ticket => {
        let serviceTime = 0;
        if (ticket.completedAt && ticket.startedAt) {
          serviceTime = (new Date(ticket.completedAt).getTime() - new Date(ticket.startedAt).getTime()) / (1000 * 60); // minutes
        } else if (ticket.updatedAt && ticket.createdAt) {
          serviceTime = (ticket.updatedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60);
        }
        if (serviceTime > 0 && serviceTime < 120) {
          barberTotalServiceTime += serviceTime;
          barberServiceTimeCount++;
          totalActivityMinutes += serviceTime;
        }
      });
      
      const barberAvgServiceTime = barberServiceTimeCount > 0 
        ? Math.round(barberTotalServiceTime / barberServiceTimeCount) 
        : 0;
      const monthActivity = monthCompletedByBarber.get(barber.id) ?? 0;
      const avgWorkTimeMinutesSinceMonthStart =
        daysElapsedThisMonth >= 1 && monthActivity >= 0
          ? Math.round(monthActivity / daysElapsedThisMonth)
          : null;
      
      return {
        id: barber.id,
        name: barber.name,
        totalServed: barberCompleted.length,
        avgServiceTime: barberAvgServiceTime,
        isPresent: barber.isPresent,
        totalActivityMinutes: Math.round(totalActivityMinutes),
        avgWorkTimeMinutesSinceMonthStart,
      };
    });

    // Peak hours and hourly distribution (in shop timezone so "peak hour" matches local business hours)
    const tz = settings.timezone ?? 'America/Sao_Paulo';
    const hourCounts: Record<number, number> = {};
    tickets.forEach(t => {
      const createdAtUtc = new Date(t.createdAt);
      const localInShop = toZonedTime(createdAtUtc, tz);
      const hour = localInShop.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHour = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0];

    const hourlyDistribution: Record<number, number> = {};
    for (let h = 0; h < 24; h++) {
      hourlyDistribution[h] = hourCounts[h] || 0;
    }

    // Service breakdown (with revenue for completed)
    const serviceCounts: Record<number, number> = {};
    const serviceRevenueCents: Record<number, number> = {};
    tickets.forEach(t => {
      serviceCounts[t.serviceId] = (serviceCounts[t.serviceId] || 0) + 1;
    });
    completedTickets.forEach(t => {
      const price = servicePriceMap.get(t.serviceId);
      if (price != null) {
        serviceRevenueCents[t.serviceId] = (serviceRevenueCents[t.serviceId] || 0) + price;
      }
    });
    const serviceBreakdown = Object.entries(serviceCounts)
      .map(([serviceId, count]) => {
        const sid = parseInt(serviceId);
        const rev = serviceRevenueCents[sid] ?? 0;
        return {
          serviceId: sid,
          serviceName: serviceMap.get(sid) || `Service ${serviceId}`,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
          revenueCents: rev,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Day of week distribution (shop timezone)
    const dayOfWeekDistribution: Record<string, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };
    tickets.forEach(t => {
      const localInShop = toZonedTime(new Date(t.createdAt), tz);
      const dayIndex = localInShop.getDay();
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
      const localInShop = toZonedTime(new Date(t.createdAt), tz);
      const dayName = dayNames[localInShop.getDay()];
      const hour = localInShop.getHours();
      
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

    // Per-barber, per-service, per-day-of-week stats (used for estimated line time)
    const weekdayStatsRows = await db.query.barberServiceWeekdayStats.findMany({
      where: eq(schema.barberServiceWeekdayStats.shopId, shop.id),
      columns: { barberId: true, serviceId: true, dayOfWeek: true, avgDuration: true, totalCompleted: true },
    });
    const barberMap = new Map(barbers.map(b => [b.id, b]));
    const barberServiceWeekdayStats = weekdayStatsRows.map(row => ({
      barberId: row.barberId,
      barberName: barberMap.get(row.barberId)?.name ?? `Barber ${row.barberId}`,
      serviceId: row.serviceId,
      serviceName: serviceMap.get(row.serviceId) ?? `Service ${row.serviceId}`,
      dayOfWeek: row.dayOfWeek,
      dayName: dayNames[row.dayOfWeek],
      avgDurationMinutes: Math.round(Number(row.avgDuration) * 10) / 10,
      totalCompleted: row.totalCompleted,
    }));

    // Per-barber, per-day-of-week productivity (all-time): aggregate from barberServiceWeekdayStats
    const allTimeByBarberDay = new Map<string, { totalCompleted: number; weightedDuration: number }>();
    for (const row of weekdayStatsRows) {
      const key = `${row.barberId}:${row.dayOfWeek}`;
      const cur = allTimeByBarberDay.get(key);
      const completed = row.totalCompleted;
      const dur = Number(row.avgDuration);
      if (cur) {
        cur.totalCompleted += completed;
        cur.weightedDuration += completed * dur;
      } else {
        allTimeByBarberDay.set(key, { totalCompleted: completed, weightedDuration: completed * dur });
      }
    }
    const tz = settings.timezone ?? 'America/Sao_Paulo';
    const barberProductivityByDayAllTime: Array<{
      barberId: number;
      barberName: string;
      dayOfWeek: number;
      dayName: string;
      avgDurationMinutes: number;
      totalCompleted: number;
    }> = [];
    for (const [key, agg] of allTimeByBarberDay) {
      const [barberIdStr, dayStr] = key.split(':');
      const barberId = parseInt(barberIdStr, 10);
      const dayOfWeek = parseInt(dayStr, 10);
      const avgDurationMinutes =
        agg.totalCompleted > 0
          ? Math.round((agg.weightedDuration / agg.totalCompleted) * 10) / 10
          : 0;
      barberProductivityByDayAllTime.push({
        barberId,
        barberName: barberMap.get(barberId)?.name ?? `Barber ${barberId}`,
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        avgDurationMinutes,
        totalCompleted: agg.totalCompleted,
      });
    }

    // Per-barber, per-day productivity for the selected period (from completed tickets in range)
    let barberProductivityByDayInPeriod: Array<{
      barberId: number;
      barberName: string;
      dayOfWeek: number;
      dayName: string;
      avgDurationMinutes: number;
      totalCompleted: number;
    }> = [];
    if (periodDays > 0) {
      const completedInPeriod = tickets.filter(
        (t) =>
          t.status === 'completed' &&
          t.barberId != null &&
          t.startedAt != null &&
          t.completedAt != null
      ) as Array<typeof tickets[0] & { barberId: number; startedAt: Date; completedAt: Date }>;
      const periodByBarberDay = new Map<string, { totalCompleted: number; totalDurationMin: number }>();
      for (const t of completedInPeriod) {
        const completedAt = new Date(t.completedAt);
        const startedAt = new Date(t.startedAt);
        const dayOfWeek = toZonedTime(completedAt, tz).getDay();
        const durationMin = (completedAt.getTime() - startedAt.getTime()) / (1000 * 60);
        const key = `${t.barberId}:${dayOfWeek}`;
        const cur = periodByBarberDay.get(key);
        if (cur) {
          cur.totalCompleted += 1;
          cur.totalDurationMin += durationMin;
        } else {
          periodByBarberDay.set(key, { totalCompleted: 1, totalDurationMin: durationMin });
        }
      }
      for (const [key, agg] of periodByBarberDay) {
        const [barberIdStr, dayStr] = key.split(':');
        const barberId = parseInt(barberIdStr, 10);
        const dayOfWeek = parseInt(dayStr, 10);
        barberProductivityByDayInPeriod.push({
          barberId,
          barberName: barberMap.get(barberId)?.name ?? `Barber ${barberId}`,
          dayOfWeek,
          dayName: dayNames[dayOfWeek],
          avgDurationMinutes:
            agg.totalCompleted > 0
              ? Math.round((agg.totalDurationMin / agg.totalCompleted) * 10) / 10
              : 0,
          totalCompleted: agg.totalCompleted,
        });
      }
    }

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

    // Walk-in vs Appointment breakdown
    const walkinCount = tickets.filter((t) => (t as { type?: string }).type !== 'appointment').length;
    const appointmentCount = tickets.filter((t) => (t as { type?: string }).type === 'appointment').length;
    const typeBreakdown = {
      walkin: walkinCount,
      appointment: appointmentCount,
      walkinPercent: total > 0 ? Math.round((walkinCount / total) * 100) : 0,
      appointmentPercent: total > 0 ? Math.round((appointmentCount / total) * 100) : 0,
    };
    const typeByDay: Record<string, { walkin: number; appointment: number }> = {};
    tickets.forEach((t) => {
      const day = t.createdAt.toISOString().split('T')[0];
      if (!typeByDay[day]) typeByDay[day] = { walkin: 0, appointment: 0 };
      if ((t as { type?: string }).type === 'appointment') {
        typeByDay[day].appointment++;
      } else {
        typeByDay[day].walkin++;
      }
    });

    // Client metrics (new vs returning)
    const ticketsWithClient = tickets.filter((t) => (t as { clientId?: number | null }).clientId != null);
    const clientIdsInPeriod = [...new Set(ticketsWithClient.map((t) => (t as { clientId: number }).clientId))];
    let uniqueClients = clientIdsInPeriod.length;
    let newClients = 0;
    let returningClients = 0;
    if (clientIdsInPeriod.length > 0) {
      const firstTicketByClient = new Map<number, Date>();
      const allTicketsForClients = await db.query.tickets.findMany({
        where: and(
          eq(schema.tickets.shopId, shop.id),
          inArray(schema.tickets.clientId, clientIdsInPeriod)
        ),
        columns: { clientId: true, createdAt: true },
      });
      for (const row of allTicketsForClients) {
        const cid = (row as { clientId: number | null }).clientId;
        if (cid == null) continue;
        const existing = firstTicketByClient.get(cid);
        if (!existing || new Date((row as { createdAt: Date }).createdAt) < existing) {
          firstTicketByClient.set(cid, new Date((row as { createdAt: Date }).createdAt));
        }
      }
      for (const cid of clientIdsInPeriod) {
        const firstAt = firstTicketByClient.get(cid);
        if (firstAt && firstAt >= since) {
          newClients++;
        } else {
          returningClients++;
        }
      }
    }
    const clientMetrics = {
      uniqueClients,
      newClients,
      returningClients,
      repeatRate: uniqueClients > 0 ? Math.round((returningClients / uniqueClients) * 100) : 0,
    };

    // Preferred barber fulfillment
    const withPreferred = tickets.filter((t) => (t as { preferredBarberId?: number | null }).preferredBarberId != null);
    const preferredCompleted = withPreferred.filter((t) => t.status === 'completed');
    const preferredFulfilled = preferredCompleted.filter(
      (t) => (t as { barberId?: number | null }).barberId === (t as { preferredBarberId?: number | null }).preferredBarberId
    );
    const preferredBarberFulfillment = {
      requested: withPreferred.length,
      fulfilled: preferredFulfilled.length,
      rate: withPreferred.length > 0 ? Math.round((preferredFulfilled.length / withPreferred.length) * 100) : 0,
    };

    // Demographics: location, gender, age, favorite haircut (from clip notes)
    const ticketClientIds = [...new Set(
      tickets
        .filter((t) => (t as { clientId?: number | null }).clientId != null)
        .map((t) => (t as { clientId: number }).clientId)
    )];
    let demographics: {
      locationBreakdown: { city: string; state?: string; count: number }[];
      genderBreakdown: { gender: string; count: number }[];
      ageBreakdown: { range: string; count: number }[];
      styleBreakdown: { style: string; count: number }[];
    } | undefined;
    if (ticketClientIds.length > 0) {
      const clientsData = await db.query.clients.findMany({
        where: and(
          eq(schema.clients.shopId, shop.id),
          inArray(schema.clients.id, ticketClientIds)
        ),
        columns: { id: true, city: true, state: true, dateOfBirth: true, gender: true },
      });
      const clientMap = new Map(clientsData.map((c) => [c.id, c]));

      const locationCounts = new Map<string, { city: string; state?: string; count: number }>();
      const genderCounts = new Map<string, number>();
      const ageRanges = ['18-24', '25-34', '35-44', '45+'] as const;
      const ageCounts = new Map<string, number>(ageRanges.map((r) => [r, 0]));

      for (const t of tickets) {
        const cid = (t as { clientId?: number | null }).clientId;
        if (cid == null) continue;
        const client = clientMap.get(cid) as { city?: string | null; state?: string | null; dateOfBirth?: Date | string | null; gender?: string | null } | undefined;
        if (!client) continue;

        if (client.city && client.city.trim()) {
          const key = `${client.city}|${client.state ?? ''}`;
          const existing = locationCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            locationCounts.set(key, {
              city: client.city.trim(),
              state: client.state && client.state.trim() ? client.state.trim() : undefined,
              count: 1,
            });
          }
        }

        const gender = (client.gender ?? 'unknown').toString().toLowerCase() || 'unknown';
        genderCounts.set(gender, (genderCounts.get(gender) ?? 0) + 1);

        if (client.dateOfBirth) {
          const dob = typeof client.dateOfBirth === 'string' ? new Date(client.dateOfBirth) : client.dateOfBirth;
          const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          if (age >= 18) {
            if (age <= 24) ageCounts.set('18-24', (ageCounts.get('18-24') ?? 0) + 1);
            else if (age <= 34) ageCounts.set('25-34', (ageCounts.get('25-34') ?? 0) + 1);
            else if (age <= 44) ageCounts.set('35-44', (ageCounts.get('35-44') ?? 0) + 1);
            else ageCounts.set('45+', (ageCounts.get('45+') ?? 0) + 1);
          }
        }
      }

      const STYLE_KEYWORDS = ['degradê', 'degrade', 'fade', 'social', 'militar', 'topete', 'raspado', 'undercut', 'baby hair', 'maquina', 'navalha'] as const;
      const styleCounts = new Map<string, number>();
      const notes = await db.query.clientClipNotes.findMany({
        where: inArray(schema.clientClipNotes.clientId, ticketClientIds),
        columns: { note: true },
      });
      for (const n of notes) {
        const noteLower = n.note.toLowerCase();
        for (const kw of STYLE_KEYWORDS) {
          if (noteLower.includes(kw)) {
            const canonical = kw === 'degrade' ? 'degradê' : kw;
            styleCounts.set(canonical, (styleCounts.get(canonical) ?? 0) + 1);
          }
        }
      }

      demographics = {
        locationBreakdown: Array.from(locationCounts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 20),
        genderBreakdown: Array.from(genderCounts.entries())
          .map(([gender, count]) => ({ gender, count }))
          .sort((a, b) => b.count - a.count),
        ageBreakdown: ageRanges.map((range) => ({ range, count: ageCounts.get(range) ?? 0 })),
        styleBreakdown: Array.from(styleCounts.entries())
          .map(([style, count]) => ({ style, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      };
    }

    // Rule-based correlations (cross-tabulations)
    const ruleBasedInsights: string[] = [];
    if (demographics) {
      const loc = demographics.locationBreakdown;
      const style = demographics.styleBreakdown;
      const gender = demographics.genderBreakdown;
      if (loc.length > 0 && style.length > 0) {
        const topCity = loc[0];
        const topStyle = style[0];
        if (topCity && topStyle) {
          ruleBasedInsights.push(`${topCity.city}${topCity.state ? ` (${topCity.state})` : ''}: ${topCity.count} clientes`);
          ruleBasedInsights.push(`Corte mais citado: ${topStyle.style} (${topStyle.count}x)`);
        }
      }
      if (gender.length > 0) {
        const top = gender[0];
        if (top) {
          const total = gender.reduce((s, g) => s + g.count, 0);
          const pct = total > 0 ? Math.round((top.count / total) * 100) : 0;
          ruleBasedInsights.push(`${top.gender === 'unknown' ? 'Não informado' : top.gender}: ${pct}% dos clientes`);
        }
      }
    }

    // Appointment metrics (no-show, punctuality)
    const appointmentTickets = tickets.filter((t) => (t as { type?: string }).type === 'appointment');
    let appointmentMetrics: {
      total: number;
      noShows: number;
      noShowRate: number;
      avgMinutesLate: number;
      onTimeCount: number;
    } | null = null;
    if (appointmentTickets.length > 0 && settings.allowAppointments) {
      const now = new Date();
      const noShows = appointmentTickets.filter((t) => {
        const st = (t as { scheduledTime?: Date | null }).scheduledTime;
        if (!st) return false;
        const scheduled = new Date(st);
        if (t.status === 'cancelled') return true;
        if (t.status === 'completed' || t.status === 'in_progress') return false;
        return scheduled < now;
      }).length;
      let totalMinutesLate = 0;
      let punctualityCount = 0;
      let onTimeCount = 0;
      appointmentTickets
        .filter((t) => t.status === 'completed')
        .forEach((t) => {
          const checkIn = (t as { checkInTime?: Date | null }).checkInTime;
          const scheduled = (t as { scheduledTime?: Date | null }).scheduledTime;
          if (checkIn && scheduled) {
            const minsLate = (new Date(checkIn).getTime() - new Date(scheduled).getTime()) / (1000 * 60);
            totalMinutesLate += minsLate;
            punctualityCount++;
            if (minsLate <= 5) onTimeCount++;
          }
        });
      appointmentMetrics = {
        total: appointmentTickets.length,
        noShows,
        noShowRate: appointmentTickets.length > 0 ? Math.round((noShows / appointmentTickets.length) * 100) : 0,
        avgMinutesLate: punctualityCount > 0 ? Math.round(totalMinutesLate / punctualityCount) : 0,
        onTimeCount,
      };
    }

    const untilForResponse = useRange && raw.until != null
      ? new Date(raw.until + 'T23:59:59.999Z')
      : new Date();

    return {
      period: {
        days: periodDays,
        since: since.toISOString(),
        until: untilForResponse.toISOString(),
      },
      summary: {
        total,
        completed,
        cancelled,
        waiting,
        inProgress,
        pending,
        completionRate,
        cancellationRate,
        avgPerDay,
        avgServiceTime,
        revenueCents,
      },
      barbers: barberStats,
      barberServiceWeekdayStats,
      barberProductivityByDayAllTime,
      barberProductivityByDayInPeriod,
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
      revenueByDay,
      typeBreakdown,
      typeByDay,
      clientMetrics,
      preferredBarberFulfillment,
      appointmentMetrics,
      ...(demographics ? { demographics } : {}),
      correlations: {
        ruleBased: ruleBasedInsights,
      },
    };
  });

  /**
   * Get barber service history (owner only).
   * Paginated list of tickets for a barber; optional since/until date filter.
   *
   * @route GET /api/shops/:slug/analytics/barbers/:barberId/history
   * @query since - YYYY-MM-DD optional
   * @query until - YYYY-MM-DD optional
   * @query page - default 1
   * @query limit - default 25, max 100
   */
  fastify.get('/shops/:slug/analytics/barbers/:barberId/history', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
      barberId: z.coerce.number().int().positive(),
    });
    const querySchema = z.object({
      since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    });
    const { slug, barberId } = validateRequest(paramsSchema, request.params);
    const { since: sinceStr, until: untilStr, page, limit } = validateRequest(querySchema, request.query);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const barber = await db.query.barbers.findFirst({
      where: and(eq(schema.barbers.id, barberId), eq(schema.barbers.shopId, shop.id)),
    });
    if (!barber) throw new NotFoundError(`Barber with ID ${barberId} not found`);

    const conditions = [
      eq(schema.tickets.shopId, shop.id),
      eq(schema.tickets.barberId, barberId),
    ];
    if (sinceStr != null) {
      conditions.push(gte(schema.tickets.createdAt, new Date(sinceStr + 'T00:00:00.000Z')));
    }
    if (untilStr != null) {
      const untilDate = new Date(untilStr + 'T00:00:00.000Z');
      untilDate.setUTCDate(untilDate.getUTCDate() + 1);
      conditions.push(lt(schema.tickets.createdAt, untilDate));
    }
    const whereClause = and(...conditions);

    const [tickets, countRows] = await Promise.all([
      db.query.tickets.findMany({
        where: whereClause,
        orderBy: [desc(schema.tickets.createdAt)],
        offset: (page - 1) * limit,
        limit,
        columns: {
          id: true,
          serviceId: true,
          status: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(schema.tickets).where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    const services = await db.query.services.findMany({
      where: eq(schema.services.shopId, shop.id),
      columns: { id: true, name: true },
    });
    const serviceNameMap = new Map(services.map((s) => [s.id, s.name]));

    const ticketsWithMeta = tickets.map((t) => {
      let durationMinutes: number | null = null;
      if (t.completedAt && t.startedAt) {
        const mins = (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / (1000 * 60);
        if (mins > 0 && mins < 120) durationMinutes = Math.round(mins);
      }
      return {
        id: t.id,
        serviceId: t.serviceId,
        serviceName: serviceNameMap.get(t.serviceId) ?? `Service ${t.serviceId}`,
        status: t.status,
        createdAt: t.createdAt,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        durationMinutes,
      };
    });

    return { tickets: ticketsWithMeta, total };
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

    const barber = await db.query.barbers.findFirst({
      where: and(eq(schema.barbers.id, barberId), eq(schema.barbers.shopId, shop.id)),
      columns: { revenueSharePercent: true },
    });
    const revenueSharePercent = barber?.revenueSharePercent != null ? barber.revenueSharePercent : 100;
    const shareMultiplier = revenueSharePercent / 100;

    const tickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shop.id),
        eq(schema.tickets.barberId, barberId),
        gte(schema.tickets.createdAt, since)
      ),
    });

    const services = await db.query.services.findMany({
      where: eq(schema.services.shopId, shop.id),
      columns: schema.serviceColumnsWithoutSortOrder,
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
      if (svc?.price != null) revenueCents += Math.round(svc.price * shareMultiplier);
    });

    const ticketsByDay: Record<string, number> = {};
    tickets.forEach(t => {
      const day = t.createdAt.toISOString().split('T')[0];
      ticketsByDay[day] = (ticketsByDay[day] || 0) + 1;
    });

    const serviceCounts: Record<number, number> = {};
    const serviceRevenueCents: Record<number, number> = {};
    completed.forEach(ticket => {
      serviceCounts[ticket.serviceId] = (serviceCounts[ticket.serviceId] || 0) + 1;
      const svc = serviceMap.get(ticket.serviceId);
      if (svc?.price != null) {
        serviceRevenueCents[ticket.serviceId] = (serviceRevenueCents[ticket.serviceId] || 0) + Math.round(svc.price * shareMultiplier);
      }
    });
    const settings = parseSettings(shop.settings);
    const canSeeProfits = settings.barbersCanSeeProfits !== false;

    const serviceBreakdown = Object.entries(serviceCounts)
      .map(([serviceId, count]) => {
        const sid = parseInt(serviceId);
        const price = serviceMap.get(sid)?.price;
        const amountCents = canSeeProfits && price != null ? (serviceRevenueCents[sid] ?? Math.round(price * count * shareMultiplier)) : 0;
        return {
          serviceId: sid,
          serviceName: serviceNameMap.get(sid) || `Service ${serviceId}`,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
          ...(canSeeProfits ? { revenueCents: amountCents } : {}),
        };
      })
      .sort((a, b) => b.count - a.count);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekDistribution: Record<string, number> = Object.fromEntries(dayNames.map(d => [d, 0]));
    tickets.forEach(t => {
      const dayName = dayNames[t.createdAt.getDay()];
      dayOfWeekDistribution[dayName]++;
    });

    // Per-service, per-day-of-week stats (used for estimated line time)
    const weekdayStatsRows = await db.query.barberServiceWeekdayStats.findMany({
      where: and(
        eq(schema.barberServiceWeekdayStats.shopId, shop.id),
        eq(schema.barberServiceWeekdayStats.barberId, barberId)
      ),
      columns: { serviceId: true, dayOfWeek: true, avgDuration: true, totalCompleted: true },
    });
    const serviceTimeByWeekday = weekdayStatsRows.map(row => ({
      serviceId: row.serviceId,
      serviceName: serviceNameMap.get(row.serviceId) ?? `Service ${row.serviceId}`,
      dayOfWeek: row.dayOfWeek,
      dayName: dayNames[row.dayOfWeek],
      avgDurationMinutes: Math.round(Number(row.avgDuration) * 10) / 10,
      totalCompleted: row.totalCompleted,
    }));

    const summaryRevenueCents = canSeeProfits ? revenueCents : 0;

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
        revenueCents: summaryRevenueCents,
      },
      ticketsByDay,
      serviceBreakdown,
      dayOfWeekDistribution,
      serviceTimeByWeekday,
    };
  });
};

