import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { ticketRoutes } from '../../routes/tickets.js';
import { getTestDb, resetTestDb } from '../helpers/db-setup.js';
import { createShop, createService, createTicket } from '../helpers/factories.js';
import { pool } from '../../db/index.js';

const MAX_RESPONSE_MS = 3000;

/**
 * Integration tests for GET /shops/:slug/tickets/active.
 * Require a running Postgres (DATABASE_URL). Skip in environments without DB.
 */
describe('GET /shops/:slug/tickets/active', () => {
  let app: ReturnType<typeof Fastify>;
  let dbAvailable: boolean;

  beforeAll(async () => {
    await getTestDb();
    try {
      await pool.query('SELECT 1');
      dbAvailable = true;
    } catch {
      dbAvailable = false;
      return;
    }
    await resetTestDb();
    app = Fastify();
    await app.register(ticketRoutes);
    await app.ready();
  });

  beforeEach(async () => {
    if (dbAvailable) await resetTestDb();
  });

  afterEach(async () => {
    if (dbAvailable) await resetTestDb();
  });

  it('returns 200 with active ticket when device has one', async () => {
    if (!dbAvailable) return;
    const shop = await createShop({ slug: 'active-test-shop' });
    const service = await createService({ shopId: shop.id });
    const deviceId = 'test-device-' + Date.now();
    await createTicket({
      shopId: shop.id,
      serviceId: service.id,
      deviceId,
      status: 'waiting',
      customerName: 'Test Customer',
    });

    const start = Date.now();
    const response = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/tickets/active?deviceId=${encodeURIComponent(deviceId)}`,
    });
    const elapsed = Date.now() - start;

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body || 'null');
    expect(data).not.toBeNull();
    expect(data.id).toBeDefined();
    expect(data.shopSlug).toBe(shop.slug);
    expect(data.status).toBe('waiting');
    expect(data.deviceId).toBe(deviceId);
    expect(data.service).toEqual({ id: service.id, name: service.name });
    expect(elapsed).toBeLessThan(MAX_RESPONSE_MS);
  });

  it('returns 200 with null when device has no active ticket', async () => {
    if (!dbAvailable) return;
    const shop = await createShop({ slug: 'no-ticket-shop' });
    await createService({ shopId: shop.id });

    const start = Date.now();
    const response = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/tickets/active?deviceId=no-such-device`,
    });
    const elapsed = Date.now() - start;

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body || 'null');
    expect(data).toBeNull();
    expect(elapsed).toBeLessThan(MAX_RESPONSE_MS);
  });

  it('returns 400 when deviceId is missing', async () => {
    if (!dbAvailable) return;
    const shop = await createShop();

    const response = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/tickets/active`,
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 200 with null for unknown slug (no 404)', async () => {
    if (!dbAvailable) return;
    const start = Date.now();
    const response = await app.inject({
      method: 'GET',
      url: '/shops/nonexistent-slug-12345/tickets/active?deviceId=some-device',
    });
    const elapsed = Date.now() - start;

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body || 'null');
    expect(data).toBeNull();
    expect(elapsed).toBeLessThan(MAX_RESPONSE_MS);
  });

  it('does not return completed or cancelled tickets', async () => {
    if (!dbAvailable) return;
    const shop = await createShop({ slug: 'completed-shop' });
    const service = await createService({ shopId: shop.id });
    const deviceId = 'device-completed';
    await createTicket({
      shopId: shop.id,
      serviceId: service.id,
      deviceId,
      status: 'completed',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/shops/${shop.slug}/tickets/active?deviceId=${encodeURIComponent(deviceId)}`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body || 'null');
    expect(data).toBeNull();
  });
});
