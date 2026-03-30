import { test, expect } from '@playwright/test';
import { apiBaseUrlWithPath } from '../config.js';

test.describe('Public Queue API', () => {
  test('supports public scope and ETag revalidation', async ({ request }) => {
    const shopsResponse = await request.get(`${apiBaseUrlWithPath}/shops`);
    expect(shopsResponse.ok()).toBeTruthy();
    const shops = (await shopsResponse.json()) as Array<{ slug?: string }>;
    const shopSlug = shops.find((shop) => typeof shop.slug === 'string' && shop.slug.length > 0)?.slug;
    test.skip(!shopSlug, 'No shop slug available for queue tests');

    const response = await request.get(`${apiBaseUrlWithPath}/shops/${encodeURIComponent(shopSlug!)}/queue?scope=public`);
    expect(response.status()).toBe(200);
    expect(response.headers()['etag']).toBeTruthy();
    expect(response.headers()['cache-control']).toContain('no-cache');

    const payload = await response.json();
    expect(payload).toHaveProperty('shop');
    expect(Array.isArray(payload.tickets)).toBe(true);
    for (const ticket of payload.tickets as Array<{ status?: string }>) {
      expect(['waiting', 'in_progress']).toContain(ticket.status);
    }

    const etag = response.headers()['etag'];
    const revalidated = await request.get(
      `${apiBaseUrlWithPath}/shops/${encodeURIComponent(shopSlug!)}/queue?scope=public`,
      { headers: { 'If-None-Match': etag } }
    );
    expect([200, 304]).toContain(revalidated.status());
  });

  test('supports status scope with minimal payload and ETag revalidation', async ({ request }) => {
    const shopsResponse = await request.get(`${apiBaseUrlWithPath}/shops`);
    expect(shopsResponse.ok()).toBeTruthy();
    const shops = (await shopsResponse.json()) as Array<{ slug?: string }>;
    const shopSlug = shops.find((shop) => typeof shop.slug === 'string' && shop.slug.length > 0)?.slug;
    test.skip(!shopSlug, 'No shop slug available for queue tests');

    const response = await request.get(`${apiBaseUrlWithPath}/shops/${encodeURIComponent(shopSlug!)}/queue?scope=status`);
    expect(response.status()).toBe(200);
    expect(response.headers()['etag']).toBeTruthy();

    const payload = await response.json();
    expect(Array.isArray(payload.tickets)).toBe(true);
    for (const ticket of payload.tickets as Array<Record<string, unknown>>) {
      expect(['waiting', 'in_progress']).toContain(ticket.status);
      expect(ticket).not.toHaveProperty('customerName');
      expect(ticket).not.toHaveProperty('service');
      expect(ticket).toHaveProperty('id');
      expect(ticket).toHaveProperty('position');
      expect(ticket).toHaveProperty('createdAt');
    }

    const etag = response.headers()['etag'];
    const revalidated = await request.get(
      `${apiBaseUrlWithPath}/shops/${encodeURIComponent(shopSlug!)}/queue?scope=status`,
      { headers: { 'If-None-Match': etag } }
    );
    expect([200, 304]).toContain(revalidated.status());
  });
});
