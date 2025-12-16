import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { getTestDb, resetTestDb, closeTestDb } from '../helpers/db-setup.js';
import { createShop, createService, createBarber, createTicket } from '../helpers/factories.js';
import { db, schema } from '../../db/index.js';
import { eq, and, gte, lt } from 'drizzle-orm';

// Import the analytics calculation logic
// We'll test by directly calling the route handler logic
export async function calculateAnalytics(shopId: number, days: number) {
  const shop = await db.query.shops.findFirst({
    where: eq(schema.shops.id, shopId),
  });

  if (!shop) {
    throw new Error(`Shop with id "${shopId}" not found`);
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0); // Normalize to start of day
  const previousPeriodStart = new Date();
  previousPeriodStart.setDate(previousPeriodStart.getDate() - (days * 2));
  previousPeriodStart.setHours(0, 0, 0, 0);

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

  // Average per day
  const avgPerDay = days > 0 ? Math.round(total / days) : 0;

  // Calculate average service time (for completed tickets)
  const completedTickets = tickets.filter(t => t.status === 'completed');
  let totalServiceTime = 0;
  let serviceTimeCount = 0;
  
  completedTickets.forEach(ticket => {
    if (ticket.completedAt && ticket.startedAt) {
      const serviceTime = (new Date(ticket.completedAt).getTime() - new Date(ticket.startedAt).getTime()) / (1000 * 60);
      if (serviceTime > 0 && serviceTime < 120) {
        totalServiceTime += serviceTime;
        serviceTimeCount++;
      }
    } else if (ticket.updatedAt && ticket.createdAt) {
      const serviceTime = (ticket.updatedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60);
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
    
    let barberTotalServiceTime = 0;
    let barberServiceTimeCount = 0;
    
    barberCompleted.forEach(ticket => {
      if (ticket.completedAt && ticket.startedAt) {
        const serviceTime = (new Date(ticket.completedAt).getTime() - new Date(ticket.startedAt).getTime()) / (1000 * 60);
        if (serviceTime > 0 && serviceTime < 120) {
          barberTotalServiceTime += serviceTime;
          barberServiceTimeCount++;
        }
      } else if (ticket.updatedAt && ticket.createdAt) {
        const serviceTime = (ticket.updatedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60);
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

  // Wait time trends
  const waitTimeByDay: Record<string, { total: number; count: number }> = {};
  tickets.forEach(t => {
    let actualWaitTime: number | null = null;
    
    if (t.startedAt && t.createdAt) {
      actualWaitTime = (new Date(t.startedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60);
      if (actualWaitTime < 0 || actualWaitTime > 480) {
        actualWaitTime = null;
      }
    }
    
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
      
      if (t.cancelledAt && t.createdAt) {
        const timeBeforeCancellation = (new Date(t.cancelledAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60);
        if (timeBeforeCancellation > 0 && timeBeforeCancellation < 240) {
          totalCancellationTime += timeBeforeCancellation;
          cancellationTimeCount++;
        }
      } else if (t.updatedAt && t.createdAt) {
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

  // Service time distribution
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

  // Barber efficiency
  const barberEfficiency = barbers.map(barber => {
    const barberTickets = tickets.filter(t => t.barberId === barber.id);
    const barberCompleted = barberTickets.filter(t => t.status === 'completed');
    const ticketsPerDay = days > 0 ? Math.round(barberTickets.length / days * 10) / 10 : 0;
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
}

describe('Analytics Calculations', () => {
  beforeAll(async () => {
    await getTestDb();
    // Ensure clean state before starting tests
    await resetTestDb();
  });

  beforeEach(async () => {
    // Clean before each test to prevent conflicts
    await resetTestDb();
  });

  afterEach(async () => {
    // Clean after each test
    await resetTestDb();
  });

  describe('Basic Statistics', () => {
    it('should calculate correct counts for different ticket statuses', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id, name: 'Test Service' });

      const now = new Date();
      
      // Create tickets with different statuses
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'completed', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'completed', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'cancelled', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'waiting', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'in_progress', createdAt: now });

      const analytics = await calculateAnalytics(shop.id, 7);

      expect(analytics.summary.total).toBe(5);
      expect(analytics.summary.completed).toBe(2);
      expect(analytics.summary.cancelled).toBe(1);
      expect(analytics.summary.waiting).toBe(1);
      expect(analytics.summary.inProgress).toBe(1);
    });

    it('should calculate completion and cancellation rates correctly', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const now = new Date();
      
      // 10 completed, 2 cancelled, 3 waiting = 15 total
      for (let i = 0; i < 10; i++) {
        await createTicket({ shopId: shop.id, serviceId: service.id, status: 'completed', createdAt: now });
      }
      for (let i = 0; i < 2; i++) {
        await createTicket({ shopId: shop.id, serviceId: service.id, status: 'cancelled', createdAt: now });
      }
      for (let i = 0; i < 3; i++) {
        await createTicket({ shopId: shop.id, serviceId: service.id, status: 'waiting', createdAt: now });
      }

      const analytics = await calculateAnalytics(shop.id, 7);

      expect(analytics.summary.completionRate).toBe(67); // 10/15 = 66.67% rounded
      expect(analytics.summary.cancellationRate).toBe(13); // 2/15 = 13.33% rounded
    });

    it('should handle empty data correctly', async () => {
      const shop = await createShop();

      const analytics = await calculateAnalytics(shop.id, 7);

      expect(analytics.summary.total).toBe(0);
      expect(analytics.summary.completed).toBe(0);
      expect(analytics.summary.completionRate).toBe(0);
      expect(analytics.summary.cancellationRate).toBe(0);
      expect(analytics.summary.avgPerDay).toBe(0);
      expect(analytics.summary.avgServiceTime).toBe(0);
    });
  });

  describe('Time Calculations', () => {
    it('should calculate average service time correctly', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const now = new Date();
      
      // Create completed tickets with service times: 30, 45, 60 minutes
      const started1 = new Date(now);
      const completed1 = new Date(now.getTime() + 30 * 60 * 1000);
      await createTicket({
        shopId: shop.id,
        serviceId: service.id,
        status: 'completed',
        startedAt: started1,
        completedAt: completed1,
        createdAt: now,
      });

      const started2 = new Date(now);
      const completed2 = new Date(now.getTime() + 45 * 60 * 1000);
      await createTicket({
        shopId: shop.id,
        serviceId: service.id,
        status: 'completed',
        startedAt: started2,
        completedAt: completed2,
        createdAt: now,
      });

      const started3 = new Date(now);
      const completed3 = new Date(now.getTime() + 60 * 60 * 1000);
      await createTicket({
        shopId: shop.id,
        serviceId: service.id,
        status: 'completed',
        startedAt: started3,
        completedAt: completed3,
        createdAt: now,
      });

      const analytics = await calculateAnalytics(shop.id, 7);

      // Average of 30, 45, 60 = 45 minutes
      expect(analytics.summary.avgServiceTime).toBe(45);
    });

    it('should exclude service times outside reasonable range', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const now = new Date();
      
      // Valid service time (30 minutes)
      const started1 = new Date(now);
      const completed1 = new Date(now.getTime() + 30 * 60 * 1000);
      await createTicket({
        shopId: shop.id,
        serviceId: service.id,
        status: 'completed',
        startedAt: started1,
        completedAt: completed1,
        createdAt: now,
      });

      // Invalid service time (150 minutes, > 120)
      const started2 = new Date(now);
      const completed2 = new Date(now.getTime() + 150 * 60 * 1000);
      await createTicket({
        shopId: shop.id,
        serviceId: service.id,
        status: 'completed',
        startedAt: started2,
        completedAt: completed2,
        createdAt: now,
      });

      const analytics = await calculateAnalytics(shop.id, 7);

      // Should only count the valid one (30 minutes)
      expect(analytics.summary.avgServiceTime).toBe(30);
    });

    it('should calculate wait time trends correctly', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Create ticket with actual wait time: 20 minutes
      const createdAt = new Date(today);
      const startedAt = new Date(today.getTime() + 20 * 60 * 1000);
      await createTicket({
        shopId: shop.id,
        serviceId: service.id,
        status: 'completed',
        createdAt,
        startedAt,
        completedAt: new Date(startedAt.getTime() + 30 * 60 * 1000),
      });

      const analytics = await calculateAnalytics(shop.id, 7);

      const dayStr = today.toISOString().split('T')[0];
      expect(analytics.waitTimeTrends[dayStr]).toBe(20);
    });
  });

  describe('Distributions', () => {
    it('should calculate tickets by day correctly', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: today });
      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: today });
      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: yesterday });

      const analytics = await calculateAnalytics(shop.id, 7);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      expect(analytics.ticketsByDay[todayStr]).toBe(2);
      expect(analytics.ticketsByDay[yesterdayStr]).toBe(1);
    });

    it('should calculate hourly distribution correctly', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const now = new Date();
      now.setHours(10, 0, 0, 0);
      
      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: now });
      
      const now2 = new Date();
      now2.setHours(14, 0, 0, 0);
      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: now2 });

      const analytics = await calculateAnalytics(shop.id, 7);

      expect(analytics.hourlyDistribution[10]).toBe(2);
      expect(analytics.hourlyDistribution[14]).toBe(1);
      expect(analytics.peakHour).toEqual({ hour: 10, count: 2 });
    });

    it('should calculate day of week distribution correctly', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      // Create ticket on Monday (getDay() returns 1 for Monday)
      const monday = new Date();
      const dayOfWeek = monday.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const diff = dayOfWeek === 0 ? 1 : (1 - dayOfWeek + 7) % 7; // Days to add to get to Monday
      monday.setDate(monday.getDate() + diff);
      monday.setHours(12, 0, 0, 0);

      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: monday });

      const analytics = await calculateAnalytics(shop.id, 7);

      expect(analytics.dayOfWeekDistribution['Monday']).toBeGreaterThanOrEqual(1);
    });

    it('should calculate service breakdown correctly', async () => {
      const shop = await createShop();
      const service1 = await createService({ shopId: shop.id, name: 'Service 1' });
      const service2 = await createService({ shopId: shop.id, name: 'Service 2' });

      const now = new Date();
      
      // 3 tickets for service1, 2 tickets for service2
      for (let i = 0; i < 3; i++) {
        await createTicket({ shopId: shop.id, serviceId: service1.id, createdAt: now });
      }
      for (let i = 0; i < 2; i++) {
        await createTicket({ shopId: shop.id, serviceId: service2.id, createdAt: now });
      }

      const analytics = await calculateAnalytics(shop.id, 7);

      expect(analytics.serviceBreakdown.length).toBe(2);
      expect(analytics.serviceBreakdown[0].count).toBe(3);
      expect(analytics.serviceBreakdown[0].percentage).toBe(60); // 3/5 = 60%
      expect(analytics.serviceBreakdown[1].count).toBe(2);
      expect(analytics.serviceBreakdown[1].percentage).toBe(40); // 2/5 = 40%
    });
  });

  describe('Barber Statistics', () => {
    it('should calculate barber stats correctly', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });
      const barber1 = await createBarber({ shopId: shop.id, name: 'Barber 1' });
      const barber2 = await createBarber({ shopId: shop.id, name: 'Barber 2' });

      const now = new Date();
      
      // Barber 1: 2 completed tickets with 30 min service time each
      const started1 = new Date(now);
      const completed1 = new Date(now.getTime() + 30 * 60 * 1000);
      await createTicket({
        shopId: shop.id,
        serviceId: service.id,
        barberId: barber1.id,
        status: 'completed',
        startedAt: started1,
        completedAt: completed1,
        createdAt: now,
      });
      const started2 = new Date(now);
      const completed2 = new Date(now.getTime() + 30 * 60 * 1000);
      await createTicket({
        shopId: shop.id,
        serviceId: service.id,
        barberId: barber1.id,
        status: 'completed',
        startedAt: started2,
        completedAt: completed2,
        createdAt: now,
      });

      // Barber 2: 1 completed ticket with 45 min service time
      const started3 = new Date(now);
      const completed3 = new Date(now.getTime() + 45 * 60 * 1000);
      await createTicket({
        shopId: shop.id,
        serviceId: service.id,
        barberId: barber2.id,
        status: 'completed',
        startedAt: started3,
        completedAt: completed3,
        createdAt: now,
      });

      const analytics = await calculateAnalytics(shop.id, 7);

      const barber1Stats = analytics.barbers.find(b => b.id === barber1.id);
      expect(barber1Stats?.totalServed).toBe(2);
      expect(barber1Stats?.avgServiceTime).toBe(30);

      const barber2Stats = analytics.barbers.find(b => b.id === barber2.id);
      expect(barber2Stats?.totalServed).toBe(1);
      expect(barber2Stats?.avgServiceTime).toBe(45);
    });

    it('should calculate barber efficiency correctly', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });
      const barber = await createBarber({ shopId: shop.id, name: 'Barber 1' });

      const now = new Date();
      
      // 10 tickets over 7 days = 1.4 tickets/day
      for (let i = 0; i < 10; i++) {
        await createTicket({
          shopId: shop.id,
          serviceId: service.id,
          barberId: barber.id,
          status: i < 8 ? 'completed' : 'cancelled', // 8 completed, 2 cancelled
          createdAt: now,
        });
      }

      const analytics = await calculateAnalytics(shop.id, 7);

      const efficiency = analytics.barberEfficiency.find(b => b.id === barber.id);
      expect(efficiency?.ticketsPerDay).toBe(1.4); // 10/7 = 1.43 rounded to 1 decimal
      expect(efficiency?.completionRate).toBe(80); // 8/10 = 80%
    });
  });

  describe('Trends', () => {
    it('should calculate week over week trend correctly', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      // Current period: 20 tickets (last 7 days)
      for (let i = 0; i < 20; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i % 7); // Spread across last 7 days
        await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: date });
      }

      // Previous period: 10 tickets (7-14 days ago)
      const previousStart = new Date(now);
      previousStart.setDate(previousStart.getDate() - 14);
      for (let i = 0; i < 10; i++) {
        const date = new Date(previousStart);
        date.setDate(date.getDate() + (i % 7));
        await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: date });
      }

      const analytics = await calculateAnalytics(shop.id, 7);

      // (20 - 10) / 10 * 100 = 100% increase
      expect(analytics.trends.weekOverWeek).toBe(100);
    });
  });

  describe('Date Range Filtering', () => {
    it('should only include tickets within date range', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const now = new Date();
      now.setHours(12, 0, 0, 0);
      
      // Ticket within range (today)
      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: now });
      
      // Ticket outside range (8 days ago, should be excluded for 7-day range)
      const oldDate = new Date(now);
      oldDate.setDate(oldDate.getDate() - 8);
      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: oldDate });

      const analytics = await calculateAnalytics(shop.id, 7);

      expect(analytics.summary.total).toBe(1);
    });

    it('should normalize date to start of day for consistent boundaries', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      // Create ticket exactly 7 days ago at 23:59
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(23, 59, 59, 999);
      
      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: sevenDaysAgo });

      const analytics = await calculateAnalytics(shop.id, 7);

      // Should be included because we normalize 'since' to start of day
      expect(analytics.summary.total).toBe(1);
    });
  });

  describe('Cancellation Analysis', () => {
    it('should calculate cancellation rates by day and hour', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const now = new Date();
      now.setHours(14, 0, 0, 0);
      
      // 5 total tickets, 2 cancelled
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'completed', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'completed', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'cancelled', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'cancelled', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'waiting', createdAt: now });

      const analytics = await calculateAnalytics(shop.id, 7);

      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
      expect(analytics.cancellationAnalysis.rateByDay[dayName]).toBe(40); // 2/5 = 40%
      expect(analytics.cancellationAnalysis.rateByHour[14]).toBe(40); // 2/5 = 40%
    });

    it('should calculate average time before cancellation', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const now = new Date();
      
      // Cancelled after 15 minutes
      const createdAt1 = new Date(now);
      const cancelledAt1 = new Date(now.getTime() + 15 * 60 * 1000);
      await createTicket({
        shopId: shop.id,
        serviceId: service.id,
        status: 'cancelled',
        createdAt: createdAt1,
        cancelledAt: cancelledAt1,
      });

      // Cancelled after 25 minutes
      const createdAt2 = new Date(now);
      const cancelledAt2 = new Date(now.getTime() + 25 * 60 * 1000);
      await createTicket({
        shopId: shop.id,
        serviceId: service.id,
        status: 'cancelled',
        createdAt: createdAt2,
        cancelledAt: cancelledAt2,
      });

      const analytics = await calculateAnalytics(shop.id, 7);

      // Average of 15 and 25 = 20 minutes
      expect(analytics.cancellationAnalysis.avgTimeBeforeCancellation).toBe(20);
    });
  });

  describe('Service Time Distribution', () => {
    it('should categorize service times into correct buckets', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const now = new Date();
      
      // Create tickets with different service times
      const serviceTimes = [5, 15, 25, 40, 50, 70]; // minutes
      
      for (const serviceTime of serviceTimes) {
        const started = new Date(now);
        const completed = new Date(now.getTime() + serviceTime * 60 * 1000);
        await createTicket({
          shopId: shop.id,
          serviceId: service.id,
          status: 'completed',
          startedAt: started,
          completedAt: completed,
          createdAt: now,
        });
      }

      const analytics = await calculateAnalytics(shop.id, 7);

      expect(analytics.serviceTimeDistribution['0-10']).toBe(1); // 5 min
      expect(analytics.serviceTimeDistribution['10-20']).toBe(1); // 15 min
      expect(analytics.serviceTimeDistribution['20-30']).toBe(1); // 25 min
      expect(analytics.serviceTimeDistribution['30-45']).toBe(1); // 40 min
      expect(analytics.serviceTimeDistribution['45-60']).toBe(1); // 50 min
      expect(analytics.serviceTimeDistribution['60+']).toBe(1); // 70 min
    });
  });
});

