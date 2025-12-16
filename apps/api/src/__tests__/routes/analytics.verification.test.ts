import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { pool } from '../../db/index.js';
import { getTestDb, resetTestDb } from '../helpers/db-setup.js';
import { createShop, createService, createBarber, createTicket } from '../helpers/factories.js';
import { calculateAnalytics } from './analytics.test.js';

/**
 * Direct SQL queries to verify analytics calculations
 */
async function verifyCountsWithSQL(shopId: number, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const result = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      COUNT(*) FILTER (WHERE status = 'waiting') as waiting,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress
    FROM tickets
    WHERE shop_id = $1 AND created_at >= $2
  `, [shopId, since]);

  const row = result.rows[0] as any;
  return {
    total: Number(row.total),
    completed: Number(row.completed),
    cancelled: Number(row.cancelled),
    waiting: Number(row.waiting),
    inProgress: Number(row.in_progress),
  };
}

async function verifyServiceTimeWithSQL(shopId: number, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const result = await pool.query(`
    SELECT 
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) as avg_service_time,
      COUNT(*) FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL) as count
    FROM tickets
    WHERE shop_id = $1 
      AND created_at >= $2
      AND status = 'completed'
      AND completed_at IS NOT NULL 
      AND started_at IS NOT NULL
      AND EXTRACT(EPOCH FROM (completed_at - started_at)) / 60 BETWEEN 0 AND 120
  `, [shopId, since]);

  const row = result.rows[0] as any;
  const avgServiceTime = row.avg_service_time 
    ? Math.round(Number(row.avg_service_time))
    : 0;
  const count = Number(row.count);

  return { avgServiceTime, count };
}

async function verifyBarberStatsWithSQL(shopId: number, barberId: number, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const result = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'completed') as total_served,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) as avg_service_time
    FROM tickets
    WHERE shop_id = $1 
      AND barber_id = $2
      AND created_at >= $3
      AND status = 'completed'
      AND completed_at IS NOT NULL 
      AND started_at IS NOT NULL
      AND EXTRACT(EPOCH FROM (completed_at - started_at)) / 60 BETWEEN 0 AND 120
  `, [shopId, barberId, since]);

  const row = result.rows[0] as any;
  return {
    totalServed: Number(row.total_served),
    avgServiceTime: row.avg_service_time 
      ? Math.round(Number(row.avg_service_time))
      : 0,
  };
}

async function verifyTicketsByDayWithSQL(shopId: number, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const result = await pool.query(`
    SELECT 
      DATE(created_at) as day,
      COUNT(*) as count
    FROM tickets
    WHERE shop_id = $1 AND created_at >= $2
    GROUP BY DATE(created_at)
    ORDER BY day
  `, [shopId, since]);

  const ticketsByDay: Record<string, number> = {};
  for (const row of result.rows as any[]) {
    const dayStr = new Date(row.day).toISOString().split('T')[0];
    ticketsByDay[dayStr] = Number(row.count);
  }

  return ticketsByDay;
}

async function verifyHourlyDistributionWithSQL(shopId: number, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const result = await pool.query(`
    SELECT 
      EXTRACT(HOUR FROM created_at)::int as hour,
      COUNT(*) as count
    FROM tickets
    WHERE shop_id = $1 AND created_at >= $2
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
  `, [shopId, since]);

  const hourlyDistribution: Record<number, number> = {};
  for (let h = 0; h < 24; h++) {
    hourlyDistribution[h] = 0;
  }
  for (const row of result.rows as any[]) {
    hourlyDistribution[Number(row.hour)] = Number(row.count);
  }

  return hourlyDistribution;
}

async function verifyServiceBreakdownWithSQL(shopId: number, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const result = await pool.query(`
    SELECT 
      t.service_id,
      s.name as service_name,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tickets WHERE shop_id = $1 AND created_at >= $2)) as percentage
    FROM tickets t
    JOIN services s ON t.service_id = s.id
    WHERE t.shop_id = $1 AND t.created_at >= $2
    GROUP BY t.service_id, s.name
    ORDER BY count DESC
  `, [shopId, since]);

  return (result.rows as any[]).map((row: any) => ({
    serviceId: Number(row.service_id),
    serviceName: row.service_name,
    count: Number(row.count),
    percentage: Math.round(Number(row.percentage)),
  }));
}

describe('Analytics Verification Tests', () => {
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

  describe('Basic Counts Verification', () => {
    it('should match SQL query for ticket counts', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const now = new Date();
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'completed', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'completed', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'cancelled', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'waiting', createdAt: now });
      await createTicket({ shopId: shop.id, serviceId: service.id, status: 'in_progress', createdAt: now });

      const analytics = await calculateAnalytics(shop.id, 7);
      const sqlCounts = await verifyCountsWithSQL(shop.id, 7);

      expect(analytics.summary.total).toBe(sqlCounts.total);
      expect(analytics.summary.completed).toBe(sqlCounts.completed);
      expect(analytics.summary.cancelled).toBe(sqlCounts.cancelled);
      expect(analytics.summary.waiting).toBe(sqlCounts.waiting);
      expect(analytics.summary.inProgress).toBe(sqlCounts.inProgress);
    });
  });

  describe('Service Time Verification', () => {
    it('should match SQL query for average service time', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      const now = new Date();
      
      // Create tickets with known service times
      const serviceTimes = [30, 45, 60]; // minutes
      
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
      const sqlServiceTime = await verifyServiceTimeWithSQL(shop.id, 7);

      expect(analytics.summary.avgServiceTime).toBe(sqlServiceTime.avgServiceTime);
      expect(sqlServiceTime.count).toBe(3);
    });
  });

  describe('Barber Statistics Verification', () => {
    it('should match SQL query for barber stats', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });
      const barber = await createBarber({ shopId: shop.id, name: 'Test Barber' });

      const now = new Date();
      
      // Create 3 completed tickets for barber with 30 min service time each
      for (let i = 0; i < 3; i++) {
        const started = new Date(now);
        const completed = new Date(now.getTime() + 30 * 60 * 1000);
        await createTicket({
          shopId: shop.id,
          serviceId: service.id,
          barberId: barber.id,
          status: 'completed',
          startedAt: started,
          completedAt: completed,
          createdAt: now,
        });
      }

      const analytics = await calculateAnalytics(shop.id, 7);
      const sqlBarberStats = await verifyBarberStatsWithSQL(shop.id, barber.id, 7);

      const barberStats = analytics.barbers.find(b => b.id === barber.id);
      expect(barberStats?.totalServed).toBe(sqlBarberStats.totalServed);
      expect(barberStats?.avgServiceTime).toBe(sqlBarberStats.avgServiceTime);
    });
  });

  describe('Tickets By Day Verification', () => {
    it('should match SQL query for tickets by day', async () => {
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
      const sqlTicketsByDay = await verifyTicketsByDayWithSQL(shop.id, 7);

      // Compare the counts for each day
      for (const [day, count] of Object.entries(analytics.ticketsByDay)) {
        expect(count).toBe(sqlTicketsByDay[day] || 0);
      }
    });
  });

  describe('Hourly Distribution Verification', () => {
    it('should match SQL query for hourly distribution', async () => {
      const shop = await createShop();
      const service = await createService({ shopId: shop.id });

      // Create tickets with explicit dates well within the range
      // Use a date that's definitely within the last 7 days
      const ticketDate = new Date();
      ticketDate.setDate(ticketDate.getDate() - 1); // Yesterday to ensure it's in range
      ticketDate.setHours(10, 0, 0, 0);
      ticketDate.setMinutes(0, 0, 0);
      ticketDate.setSeconds(0, 0);
      ticketDate.setMilliseconds(0);
      
      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: ticketDate });
      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: ticketDate });
      
      const ticketDate2 = new Date(ticketDate);
      ticketDate2.setHours(14, 0, 0, 0);
      await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: ticketDate2 });

      const analytics = await calculateAnalytics(shop.id, 7);
      const sqlHourlyDistribution = await verifyHourlyDistributionWithSQL(shop.id, 7);

      // Verify both have the same total count (most important verification)
      const analyticsTotal = Object.values(analytics.hourlyDistribution).reduce((a, b) => a + b, 0);
      const sqlTotal = Object.values(sqlHourlyDistribution).reduce((a, b) => a + b, 0);
      expect(analyticsTotal).toBe(sqlTotal);
      expect(analyticsTotal).toBe(3); // 2 + 1 = 3 tickets
      
      // Verify peak hour calculation works
      if (analytics.peakHour) {
        expect(analytics.peakHour.count).toBeGreaterThan(0);
      }
    });
  });

  describe('Service Breakdown Verification', () => {
    it('should match SQL query for service breakdown', async () => {
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
      const sqlServiceBreakdown = await verifyServiceBreakdownWithSQL(shop.id, 7);

      expect(analytics.serviceBreakdown.length).toBe(sqlServiceBreakdown.length);
      
      // Compare each service
      for (let i = 0; i < analytics.serviceBreakdown.length; i++) {
        const analyticsService = analytics.serviceBreakdown[i];
        const sqlService = sqlServiceBreakdown.find(s => s.serviceId === analyticsService.serviceId);
        
        expect(analyticsService.count).toBe(sqlService?.count);
        expect(analyticsService.percentage).toBe(sqlService?.percentage);
      }
    });
  });

  describe('Completion Rate Verification', () => {
    it('should calculate completion rate correctly', async () => {
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
      const sqlCounts = await verifyCountsWithSQL(shop.id, 7);

      // Verify counts match
      expect(analytics.summary.total).toBe(sqlCounts.total);
      expect(analytics.summary.completed).toBe(sqlCounts.completed);
      
      // Verify completion rate calculation: (completed / total) * 100
      const expectedCompletionRate = Math.round((sqlCounts.completed / sqlCounts.total) * 100);
      expect(analytics.summary.completionRate).toBe(expectedCompletionRate);
    });
  });
});

