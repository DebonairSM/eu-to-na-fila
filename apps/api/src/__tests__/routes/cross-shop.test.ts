import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { analyticsRoutes } from '../../routes/analytics.js';
import { ticketRoutes } from '../../routes/tickets.js';
import { barberRoutes } from '../../routes/barbers.js';
import { shopsRoutes } from '../../routes/shops.js';
import { companyShopsRoutes } from '../../routes/company-shops.js';
import { getTestDb, resetTestDb } from '../helpers/db-setup.js';
import { createShop, createService, createBarber, createTicket } from '../helpers/factories.js';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/index.js';
import { signToken } from '../../lib/jwt.js';

/**
 * SEC-001 — Cross-shop authorization negative tests.
 *
 * Council decision: no authorization fix without negative tests.
 * Each test below asserts the SECURE behavior (403/404). Tests that fail today
 * are the SEC-001B enforcement punch list; tests that pass today are
 * regression locks for boundaries already covered.
 *
 * Status semantics (per advisor guidance — not normalized):
 *  - 403 Forbidden: route uses (or should use) middleware/check that compares
 *    user.shopId to the target shop (mirrors `requireShopAccess`,
 *    `requireBarberShop`, and the post-fetch `existingTicket.shopId !==
 *    request.user.shopId` pattern in tickets.ts).
 *  - 404 NotFound: route narrows the query by scope and treats no-match as
 *    not-found (e.g. company-shops `findFirst({ where: and(id, companyId) })`).
 *
 * SEC-001 stance: owner JWTs are scoped to a single shopId. The existing
 * `requireShopAccess` owner-bypass at auth.ts:154-156 ("multi-shop support in
 * future") is part of the gap these tests document — not a feature to keep.
 *
 * Heads-up: a couple of vulnerable routes (e.g. bulk-DELETE /shops/:slug/tickets)
 * will, on today's code, complete the unauthorized mutation BEFORE the assertion
 * fails. `afterEach` resets the DB so this is contained, but reviewers running
 * the file should expect mutation side-effects until SEC-001B lands.
 *
 * Verification:
 *   pnpm --filter api test:run -- cross-shop
 *   pnpm --filter api build  # if any TypeScript/middleware change is made
 *
 * Pass/fail breakdown (TO BE CAPTURED on first run — see handoff notes):
 *   The expected shape is "regression locks" pass and "vulnerability docs" fail.
 *   Regression locks: tickets PATCH/DELETE, analytics/me, company-shops list
 *     and PATCH-cross-company.
 *   Expected to fail (SEC-001B punch list):
 *     analytics three owner routes, bulk-DELETE tickets, appointment create,
 *     barbers presence/status/details, shops temporary-status PATCH/DELETE,
 *     barber cross-shop presence (currently 400, should be 403).
 *
 * Scope:
 *   - owner / staff / barber / company_admin cross-tenant attempts
 *   - public / unguessable-link endpoints are intentionally out of scope
 *     for this first pass (handoff defers them).
 */

async function createCompany(suffix: string) {
  const slug = `co-${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 8)}`;
  const [company] = await db
    .insert(schema.companies)
    .values({ name: `Company ${suffix}`, slug })
    .returning();
  return company;
}

describe('Cross-shop authorization (SEC-001)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await getTestDb();

    app = Fastify();
    await app.register(analyticsRoutes);
    await app.register(ticketRoutes);
    await app.register(barberRoutes);
    await app.register(shopsRoutes);
    await app.register(companyShopsRoutes);
    await app.ready();

    await resetTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  afterEach(async () => {
    await resetTestDb();
  });

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------
  describe('Analytics — owner-only routes', () => {
    it('owner from Shop A cannot read Shop B analytics', async () => {
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'owner' });
      const res = await app.inject({
        method: 'GET',
        url: `/shops/${shopB.slug}/analytics?days=7`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('owner from Shop A cannot read Shop B barber-productivity-by-week', async () => {
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'owner' });
      const res = await app.inject({
        method: 'GET',
        url: `/shops/${shopB.slug}/analytics/barber-productivity-by-week?weekStart=2026-04-27`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('owner from Shop A cannot read Shop B barber history', async () => {
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });
      const barberB = await createBarber({ shopId: shopB.id, name: 'Barber B' });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'owner' });
      const res = await app.inject({
        method: 'GET',
        url: `/shops/${shopB.slug}/analytics/barbers/${barberB.id}/history`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('barber from Shop A cannot read Shop B analytics/me', async () => {
      // requireBarberShop already enforces this — regression lock.
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });
      const barberA = await createBarber({ shopId: shopA.id, name: 'Barber A' });

      const token = signToken({
        userId: 1,
        shopId: shopA.id,
        role: 'barber',
        barberId: barberA.id,
      });
      const res = await app.inject({
        method: 'GET',
        url: `/shops/${shopB.slug}/analytics/me?days=7`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Tickets
  // ---------------------------------------------------------------------------
  describe('Tickets — staff/owner routes', () => {
    it('staff from Shop A cannot PATCH a ticket belonging to Shop B', async () => {
      // tickets.ts:474 — existing post-fetch shopId guard. Regression lock.
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });
      const serviceB = await createService({ shopId: shopB.id });
      const ticketB = await createTicket({ shopId: shopB.id, serviceId: serviceB.id });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'staff' });
      const res = await app.inject({
        method: 'PATCH',
        url: `/tickets/${ticketB.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'cancelled' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('staff from Shop A cannot DELETE a ticket belonging to Shop B', async () => {
      // tickets.ts:618 — existing post-fetch shopId guard. Regression lock.
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });
      const serviceB = await createService({ shopId: shopB.id });
      const ticketB = await createTicket({ shopId: shopB.id, serviceId: serviceB.id });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'staff' });
      const res = await app.inject({
        method: 'DELETE',
        url: `/tickets/${ticketB.id}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('owner from Shop A cannot bulk-DELETE Shop B tickets', async () => {
      // DELETE /shops/:slug/tickets currently only checks requireRole(['owner']).
      // Until SEC-001B fixes this, the failing test path actually wipes Shop B's
      // tickets before the assertion fires. afterEach resets — do not panic.
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'owner' });
      const res = await app.inject({
        method: 'DELETE',
        url: `/shops/${shopB.slug}/tickets`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('staff from Shop A cannot create an appointment in Shop B', async () => {
      // POST /shops/:slug/tickets/appointment — only requireRole(['owner','staff','barber']).
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });
      const serviceB = await createService({ shopId: shopB.id });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'staff' });
      const res = await app.inject({
        method: 'POST',
        url: `/shops/${shopB.slug}/tickets/appointment`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          serviceId: serviceB.id,
          customerName: 'Cross-shop Customer',
          scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Barbers (presence / status / details)
  // ---------------------------------------------------------------------------
  describe('Barbers — id-scoped routes', () => {
    it('owner from Shop A cannot toggle presence of Shop B barber', async () => {
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });
      const barberB = await createBarber({ shopId: shopB.id, name: 'Barber B' });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'owner' });
      const res = await app.inject({
        method: 'PATCH',
        url: `/barbers/${barberB.id}/presence`,
        headers: { authorization: `Bearer ${token}` },
        payload: { isPresent: false },
      });

      expect(res.statusCode).toBe(403);
    });

    it('staff from Shop A cannot toggle active-status of Shop B barber', async () => {
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });
      const barberB = await createBarber({ shopId: shopB.id, name: 'Barber B' });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'staff' });
      const res = await app.inject({
        method: 'PATCH',
        url: `/barbers/${barberB.id}/status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { isActive: false },
      });

      expect(res.statusCode).toBe(403);
    });

    it('barber from Shop A cannot toggle presence of a barber in Shop B', async () => {
      // barbers.ts:118 only checks barberId-vs-self (ValidationError → 400),
      // never the shop scope. After fix the same call must reject as 403.
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });
      const barberA = await createBarber({ shopId: shopA.id, name: 'Barber A' });
      const barberB = await createBarber({ shopId: shopB.id, name: 'Barber B' });

      const token = signToken({
        userId: 1,
        shopId: shopA.id,
        role: 'barber',
        barberId: barberA.id,
      });
      const res = await app.inject({
        method: 'PATCH',
        url: `/barbers/${barberB.id}/presence`,
        headers: { authorization: `Bearer ${token}` },
        payload: { isPresent: false },
      });

      expect(res.statusCode).toBe(403);
    });

    it('owner from Shop A cannot edit details of Shop B barber', async () => {
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });
      const barberB = await createBarber({ shopId: shopB.id, name: 'Original Name' });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'owner' });
      const res = await app.inject({
        method: 'PATCH',
        url: `/barbers/${barberB.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Hijacked Name' },
      });

      expect(res.statusCode).toBe(403);

      // Defense-in-depth: name should not have changed regardless of status.
      const after = await db.query.barbers.findFirst({
        where: eq(schema.barbers.id, barberB.id),
      });
      expect(after?.name).toBe('Original Name');
    });
  });

  // ---------------------------------------------------------------------------
  // Shops — temporary-status (owner-only)
  // ---------------------------------------------------------------------------
  describe('Shops — temporary-status', () => {
    it('owner from Shop A cannot set Shop B temporary-status', async () => {
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'owner' });
      const res = await app.inject({
        method: 'PATCH',
        url: `/shops/${shopB.slug}/temporary-status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { isOpen: false, durationMinutes: 30, reason: 'cross-shop attempt' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('owner from Shop A cannot clear Shop B temporary-status', async () => {
      const shopA = await createShop({ name: 'Shop A' });
      const shopB = await createShop({ name: 'Shop B' });

      const token = signToken({ userId: 1, shopId: shopA.id, role: 'owner' });
      const res = await app.inject({
        method: 'DELETE',
        url: `/shops/${shopB.slug}/temporary-status`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Company shops — company_admin
  // ---------------------------------------------------------------------------
  describe('Company shops — company_admin', () => {
    it('company_admin from Company A cannot list Company B shops', async () => {
      // company-shops.ts:55 already enforces `user.companyId !== id` — regression lock.
      const companyA = await createCompany('A');
      const companyB = await createCompany('B');

      const token = signToken({
        userId: 1,
        companyId: companyA.id,
        role: 'company_admin',
      });
      const res = await app.inject({
        method: 'GET',
        url: `/companies/${companyB.id}/shops`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('company_admin from Company A cannot PATCH a Company-B shop via the Company-A path', async () => {
      // company-shops.ts:229 narrows shop lookup by (id, companyId) — no match → 404.
      // Regression lock for the existing pattern.
      const companyA = await createCompany('A');
      const companyB = await createCompany('B');
      const shopInB = await createShop({ name: 'Shop in Company B' });
      await db
        .update(schema.shops)
        .set({ companyId: companyB.id })
        .where(eq(schema.shops.id, shopInB.id));

      const token = signToken({
        userId: 1,
        companyId: companyA.id,
        role: 'company_admin',
      });
      const res = await app.inject({
        method: 'PATCH',
        // Use Company A's id in the path (so the companyId middleware passes),
        // but the shopId belongs to Company B. The route's findFirst returns null → 404.
        url: `/companies/${companyA.id}/shops/${shopInB.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Cross-company hijack attempt' },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
