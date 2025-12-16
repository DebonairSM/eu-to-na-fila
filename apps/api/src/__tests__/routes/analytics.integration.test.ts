import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import Fastify from 'fastify';
import { analyticsRoutes } from '../../routes/analytics.js';
import { getTestDb, resetTestDb } from '../helpers/db-setup.js';
import { createShop, createService, createBarber, createTicket } from '../helpers/factories.js';
import { signToken } from '../../lib/jwt.js';

describe('Analytics Integration Tests', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    await getTestDb();
    
    app = Fastify();
    await app.register(analyticsRoutes);
    await app.ready();
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

  it('should return analytics data for a shop', async () => {
    const shop = await createShop();
    const service = await createService({ shopId: shop.id });
    
    const now = new Date();
    await createTicket({ shopId: shop.id, serviceId: service.id, status: 'completed', createdAt: now });
    await createTicket({ shopId: shop.id, serviceId: service.id, status: 'completed', createdAt: now });
    await createTicket({ shopId: shop.id, serviceId: service.id, status: 'cancelled', createdAt: now });

    const token = signToken({
      userId: 1,
      shopId: shop.id,
      role: 'owner',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/analytics?days=7`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    
    expect(data.summary.total).toBe(3);
    expect(data.summary.completed).toBe(2);
    expect(data.summary.cancelled).toBe(1);
    expect(data.period.days).toBe(7);
  });

  it('should require authentication', async () => {
    const shop = await createShop();

    const response = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/analytics?days=7`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should require owner role', async () => {
    const shop = await createShop();

    const token = signToken({
      userId: 1,
      shopId: shop.id,
      role: 'staff',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/analytics?days=7`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should return 404 for non-existent shop', async () => {
    const token = signToken({
      userId: 1,
      shopId: 999,
      role: 'owner',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/shops/non-existent/analytics?days=7',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should handle different day ranges', async () => {
    const shop = await createShop();
    const service = await createService({ shopId: shop.id });

    const now = new Date();
    await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: now });

    const token = signToken({
      userId: 1,
      shopId: shop.id,
      role: 'owner',
    });

    // Test 7 days
    const response7 = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/analytics?days=7`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    expect(response7.statusCode).toBe(200);
    const data7 = JSON.parse(response7.body);
    expect(data7.period.days).toBe(7);

    // Test 30 days
    const response30 = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/analytics?days=30`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    expect(response30.statusCode).toBe(200);
    const data30 = JSON.parse(response30.body);
    expect(data30.period.days).toBe(30);
  });

  it('should return complete analytics structure', async () => {
    const shop = await createShop();
    const service = await createService({ shopId: shop.id });
    const barber = await createBarber({ shopId: shop.id });

    const now = new Date();
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

    const token = signToken({
      userId: 1,
      shopId: shop.id,
      role: 'owner',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/analytics?days=7`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    
    // Verify all expected fields are present
    expect(data).toHaveProperty('period');
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('barbers');
    expect(data).toHaveProperty('ticketsByDay');
    expect(data).toHaveProperty('hourlyDistribution');
    expect(data).toHaveProperty('peakHour');
    expect(data).toHaveProperty('serviceBreakdown');
    expect(data).toHaveProperty('dayOfWeekDistribution');
    expect(data).toHaveProperty('waitTimeTrends');
    expect(data).toHaveProperty('cancellationAnalysis');
    expect(data).toHaveProperty('serviceTimeDistribution');
    expect(data).toHaveProperty('barberEfficiency');
    expect(data).toHaveProperty('trends');
    
    // Verify summary structure
    expect(data.summary).toHaveProperty('total');
    expect(data.summary).toHaveProperty('completed');
    expect(data.summary).toHaveProperty('cancelled');
    expect(data.summary).toHaveProperty('waiting');
    expect(data.summary).toHaveProperty('inProgress');
    expect(data.summary).toHaveProperty('completionRate');
    expect(data.summary).toHaveProperty('cancellationRate');
    expect(data.summary).toHaveProperty('avgPerDay');
    expect(data.summary).toHaveProperty('avgServiceTime');
  });

  it('should filter tickets by date range correctly', async () => {
    const shop = await createShop();
    const service = await createService({ shopId: shop.id });

    const now = new Date();
    now.setHours(12, 0, 0, 0);
    
    // Ticket within range (today)
    await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: now });
    
    // Ticket outside range (8 days ago)
    const oldDate = new Date(now);
    oldDate.setDate(oldDate.getDate() - 8);
    await createTicket({ shopId: shop.id, serviceId: service.id, createdAt: oldDate });

    const token = signToken({
      userId: 1,
      shopId: shop.id,
      role: 'owner',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/analytics?days=7`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    
    // Should only include the ticket from today
    expect(data.summary.total).toBe(1);
  });

  it('should calculate barber statistics correctly', async () => {
    const shop = await createShop();
    const service = await createService({ shopId: shop.id });
    const barber1 = await createBarber({ shopId: shop.id, name: 'Barber 1' });
    const barber2 = await createBarber({ shopId: shop.id, name: 'Barber 2' });

    const now = new Date();
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

    await createTicket({
      shopId: shop.id,
      serviceId: service.id,
      barberId: barber2.id,
      status: 'completed',
      startedAt: started1,
      completedAt: completed1,
      createdAt: now,
    });

    const token = signToken({
      userId: 1,
      shopId: shop.id,
      role: 'owner',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/analytics?days=7`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    
    expect(data.barbers.length).toBe(2);
    const barber1Stats = data.barbers.find((b: any) => b.id === barber1.id);
    expect(barber1Stats?.totalServed).toBe(1);
    expect(barber1Stats?.avgServiceTime).toBe(30);
  });
});

