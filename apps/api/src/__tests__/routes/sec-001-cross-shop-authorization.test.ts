import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import Fastify, { type FastifyInstance, type InjectOptions } from 'fastify';
import { eq } from 'drizzle-orm';
import { analyticsRoutes } from '../../routes/analytics.js';
import { authRoutes } from '../../routes/auth.js';
import { barberRoutes } from '../../routes/barbers.js';
import { clientsRoutes } from '../../routes/clients.js';
import { companyShopsRoutes } from '../../routes/company-shops.js';
import { queueRoutes } from '../../routes/queue.js';
import { serviceRoutes } from '../../routes/services.js';
import { shopsRoutes } from '../../routes/shops.js';
import { ticketRoutes } from '../../routes/tickets.js';
import { db, schema } from '../../db/index.js';
import { signToken, type JWTPayload } from '../../lib/jwt.js';
import { createBarber, createService, createShop, createTicket } from '../helpers/factories.js';
import { getTestDb, resetTestDb } from '../helpers/db-setup.js';

type TokenRole = JWTPayload['role'];

interface CrossShopFixture {
  companyA: { id: number };
  companyB: { id: number };
  shopA: Awaited<ReturnType<typeof createShop>>;
  shopB: Awaited<ReturnType<typeof createShop>>;
  serviceB: Awaited<ReturnType<typeof createService>>;
  deletableServiceB: Awaited<ReturnType<typeof createService>>;
  barberA: Awaited<ReturnType<typeof createBarber>>;
  barberB: Awaited<ReturnType<typeof createBarber>>;
  clientA: typeof schema.clients.$inferSelect;
  clientB: typeof schema.clients.$inferSelect;
  ticketB: Awaited<ReturnType<typeof createTicket>>;
}

/**
 * SEC-001B — executable negative cases from
 * docs/security/sec-001a-route-inventory.md section 4.1.
 *
 * Every A-number below maps one-for-one to the inventory. The tests assert the
 * secure contract (403), so vulnerable handlers intentionally make this suite
 * RED until SEC-001C adds enforcement. Existing 403/404 cases are regression
 * locks for actor types whose tenant checks already hold.
 */
describe.sequential('SEC-001 cross-shop authorization', () => {
  let app: FastifyInstance;
  let fixture: CrossShopFixture;

  function token(
    role: TokenRole,
    overrides: Partial<Pick<JWTPayload, 'shopId' | 'companyId' | 'barberId' | 'clientId'>> = {}
  ) {
    return signToken({ userId: 10_001, role, ...overrides });
  }

  function request(
    authToken: string,
    options: Omit<InjectOptions, 'headers'> & { headers?: InjectOptions['headers'] }
  ) {
    return app.inject({
      ...options,
      headers: {
        ...options.headers,
        authorization: `Bearer ${authToken}`,
      },
    });
  }

  async function createCompany(label: string) {
    const [company] = await db
      .insert(schema.companies)
      .values({
        name: `SEC-001 Company ${label}`,
        slug: `sec-001-company-${label.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      .returning({ id: schema.companies.id });
    return company;
  }

  async function createFixture(): Promise<CrossShopFixture> {
    const companyA = await createCompany('A');
    const companyB = await createCompany('B');
    const shopA = await createShop({ name: 'SEC-001 Shop A' });
    const shopB = await createShop({ name: 'SEC-001 Shop B' });

    await db
      .update(schema.shops)
      .set({ companyId: companyA.id })
      .where(eq(schema.shops.id, shopA.id));
    await db
      .update(schema.shops)
      .set({ companyId: companyB.id, settings: { allowAppointments: true } })
      .where(eq(schema.shops.id, shopB.id));

    const serviceB = await createService({ shopId: shopB.id, name: 'Shop B Cut' });
    const deletableServiceB = await createService({ shopId: shopB.id, name: 'Shop B Delete Target' });
    const barberA = await createBarber({ shopId: shopA.id, name: 'Shop A Barber' });
    const barberB = await createBarber({ shopId: shopB.id, name: 'Shop B Barber' });

    const [clientA] = await db
      .insert(schema.clients)
      .values({ companyId: companyA.id, phone: '15550000001', name: 'Shop A Client' })
      .returning();
    const [clientB] = await db
      .insert(schema.clients)
      .values({
        companyId: companyB.id,
        phone: '15550000002',
        name: 'Shop B Client',
        nextServiceImageUrl: 'https://example.test/shop-b-reference.jpg',
      })
      .returning();

    const ticketB = await createTicket({
      shopId: shopB.id,
      serviceId: serviceB.id,
      customerName: 'Shop B Ticket Owner',
    });
    await db
      .update(schema.tickets)
      .set({ clientId: clientB.id })
      .where(eq(schema.tickets.id, ticketB.id));

    return {
      companyA,
      companyB,
      shopA,
      shopB,
      serviceB,
      deletableServiceB,
      barberA,
      barberB,
      clientA,
      clientB,
      ticketB,
    };
  }

  beforeAll(async () => {
    await getTestDb();
    app = Fastify();
    await app.register(analyticsRoutes);
    await app.register(authRoutes);
    await app.register(barberRoutes);
    await app.register(clientsRoutes);
    await app.register(companyShopsRoutes);
    await app.register(queueRoutes);
    await app.register(serviceRoutes);
    await app.register(shopsRoutes);
    await app.register(ticketRoutes);
    await app.ready();
  });

  beforeEach(async () => {
    await resetTestDb();
    fixture = await createFixture();
  });

  afterEach(async () => {
    // Several vulnerable mutation handlers alter Shop B before the 403
    // assertion fails. Reset after every case to contain those side effects.
    await resetTestDb();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('barber resources', () => {
    it('A1 owner at Shop A cannot change a Shop B barber presence', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'PATCH',
        url: `/barbers/${fixture.barberB.id}/presence`,
        payload: { isPresent: false },
      });

      expect(response.statusCode).toBe(403);
    });

    it('A2 owner at Shop A cannot change a Shop B barber status', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'PATCH',
        url: `/barbers/${fixture.barberB.id}/status`,
        payload: { isActive: false },
      });

      expect(response.statusCode).toBe(403);
    });

    it('A3 barber at Shop A cannot change a Shop B barber presence', async () => {
      const response = await request(
        token('barber', { shopId: fixture.shopA.id, barberId: fixture.barberA.id }),
        {
          method: 'PATCH',
          url: `/barbers/${fixture.barberB.id}/presence`,
          payload: { isPresent: false },
        }
      );

      expect(response.statusCode).toBe(403);
    });

    it('A4 owner at Shop A cannot change a Shop B barber login or profile', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'PATCH',
        url: `/barbers/${fixture.barberB.id}`,
        payload: { name: 'Cross-shop takeover', username: 'foreign-owner', password: 'SecurePass123!' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('A5 owner at Shop A cannot set a Shop B barber password', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'POST',
        url: `/shops/${fixture.shopB.slug}/barbers/${fixture.barberB.id}/set-password`,
        payload: { password: 'SecurePass123!' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('A6 owner at Shop A cannot create a barber in Shop B', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'POST',
        url: `/shops/${fixture.shopB.slug}/barbers`,
        payload: { name: 'Injected Shop B Barber' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('A7 owner at Shop A cannot delete a Shop B barber', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'DELETE',
        url: `/barbers/${fixture.barberB.id}`,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('service resources', () => {
    it('A8 owner at Shop A cannot create a service in Shop B', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'POST',
        url: `/shops/${fixture.shopB.slug}/services`,
        payload: { name: 'Injected Service', duration: 30, price: 5_000 },
      });

      expect(response.statusCode).toBe(403);
    });

    it('A9 owner at Shop A cannot reorder Shop B services', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'POST',
        url: `/shops/${fixture.shopB.slug}/services/reorder`,
        payload: { ids: [fixture.deletableServiceB.id, fixture.serviceB.id] },
      });

      expect(response.statusCode).toBe(403);
    });

    it('A10 owner at Shop A cannot edit a Shop B service', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'PATCH',
        url: `/services/${fixture.serviceB.id}`,
        payload: { name: 'Cross-shop price manipulation', price: 1 },
      });

      expect(response.statusCode).toBe(403);
    });

    it('A11 owner at Shop A cannot delete a Shop B service', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'DELETE',
        url: `/services/${fixture.deletableServiceB.id}`,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('queue and ticket resources', () => {
    it('A12 owner at Shop A cannot recalculate the Shop B queue', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'POST',
        url: `/shops/${fixture.shopB.slug}/recalculate`,
      });

      expect(response.statusCode).toBe(403);
    });

    it('A13 owner at Shop A cannot create an appointment in Shop B', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'POST',
        url: `/shops/${fixture.shopB.slug}/tickets/appointment`,
        payload: {
          serviceId: fixture.serviceB.id,
          customerName: 'Cross-shop appointment',
          scheduledTime: new Date(Date.now() + 86_400_000).toISOString(),
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('A14 barber at Shop A cannot create an appointment in Shop B', async () => {
      const response = await request(
        token('barber', { shopId: fixture.shopA.id, barberId: fixture.barberA.id }),
        {
          method: 'POST',
          url: `/shops/${fixture.shopB.slug}/tickets/appointment`,
          payload: {
            serviceId: fixture.serviceB.id,
            customerName: 'Cross-shop barber appointment',
            scheduledTime: new Date(Date.now() + 86_400_000).toISOString(),
          },
        }
      );

      expect(response.statusCode).toBe(403);
    });

    it('A15 owner at Shop A cannot bulk-delete Shop B tickets', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'DELETE',
        url: `/shops/${fixture.shopB.slug}/tickets`,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('shop temporary status', () => {
    it('A16 owner at Shop A cannot set Shop B temporary status', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'PATCH',
        url: `/shops/${fixture.shopB.slug}/temporary-status`,
        payload: { isOpen: false, durationMinutes: 30, reason: 'Cross-shop closure' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('A17 owner at Shop A cannot clear Shop B temporary status', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'DELETE',
        url: `/shops/${fixture.shopB.slug}/temporary-status`,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('client resources', () => {
    it('A18 owner at Shop A cannot list Shop B clients', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'GET',
        url: `/shops/${fixture.shopB.slug}/clients/list`,
      });

      expect(response.statusCode).toBe(403);
    });

    it('A19 owner at Shop A cannot search Shop B clients', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'GET',
        url: `/shops/${fixture.shopB.slug}/clients?q=Shop`,
      });

      expect(response.statusCode).toBe(403);
    });

    it('A20 staff at Shop A cannot search Shop B clients', async () => {
      const response = await request(token('staff', { shopId: fixture.shopA.id }), {
        method: 'GET',
        url: `/shops/${fixture.shopB.slug}/clients?q=Shop`,
      });

      expect(response.statusCode).toBe(403);
    });

    it('A21 owner at Shop A cannot read a Shop B client', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'GET',
        url: `/shops/${fixture.shopB.slug}/clients/${fixture.clientB.id}`,
      });

      expect(response.statusCode).toBe(403);
    });

    it('A22 staff at Shop A cannot read a Shop B client reference image', async () => {
      const response = await request(token('staff', { shopId: fixture.shopA.id }), {
        method: 'GET',
        url: `/shops/${fixture.shopB.slug}/clients/${fixture.clientB.id}/reference-image`,
      });

      expect(response.statusCode).toBe(403);
    });

    it('A23 owner at Shop A cannot edit a Shop B client', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'PATCH',
        url: `/shops/${fixture.shopB.slug}/clients/${fixture.clientB.id}`,
        payload: { name: 'Cross-shop client edit' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('A24 staff at Shop A cannot add a clip note to a Shop B client', async () => {
      const response = await request(token('staff', { shopId: fixture.shopA.id }), {
        method: 'POST',
        url: `/shops/${fixture.shopB.slug}/clients/${fixture.clientB.id}/clip-notes`,
        payload: { note: 'Cross-shop note', barberId: fixture.barberB.id },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('analytics reads', () => {
    it('A25 owner at Shop A cannot read Shop B analytics and revenue', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'GET',
        url: `/shops/${fixture.shopB.slug}/analytics?days=7`,
      });

      expect(response.statusCode).toBe(403);
    });

    it('A26 owner at Shop A cannot read Shop B weekly barber productivity', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'GET',
        url: `/shops/${fixture.shopB.slug}/analytics/barber-productivity-by-week?weekStart=2026-07-13`,
      });

      expect(response.statusCode).toBe(403);
    });

    it('A27 owner at Shop A cannot read a Shop B barber history', async () => {
      const response = await request(token('owner', { shopId: fixture.shopA.id }), {
        method: 'GET',
        url: `/shops/${fixture.shopB.slug}/analytics/barbers/${fixture.barberB.id}/history`,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('already-scoped actor regression locks', () => {
    it('customer at Shop A cannot read its customer profile through Shop B', async () => {
      const response = await request(
        token('customer', { shopId: fixture.shopA.id, clientId: fixture.clientA.id }),
        {
          method: 'GET',
          url: `/shops/${fixture.shopB.slug}/auth/customer/me`,
        }
      );

      expect(response.statusCode).toBe(404);
    });

    it('customer at Shop A cannot check in a Shop B customer ticket', async () => {
      const response = await request(
        token('customer', { shopId: fixture.shopA.id, clientId: fixture.clientA.id }),
        {
          method: 'POST',
          url: `/shops/${fixture.shopB.slug}/tickets/${fixture.ticketB.id}/check-in`,
        }
      );

      expect(response.statusCode).toBe(403);
    });

    it('company admin at Company A cannot list Company B shops', async () => {
      const response = await request(
        token('company_admin', { companyId: fixture.companyA.id }),
        {
          method: 'GET',
          url: `/companies/${fixture.companyB.id}/shops`,
        }
      );

      expect(response.statusCode).toBe(403);
    });

    it('company admin at Company A cannot edit a Company B shop through a Company A path', async () => {
      const response = await request(
        token('company_admin', { companyId: fixture.companyA.id }),
        {
          method: 'PATCH',
          url: `/companies/${fixture.companyA.id}/shops/${fixture.shopB.id}`,
          payload: { name: 'Cross-company shop edit' },
        }
      );

      expect(response.statusCode).toBe(404);
    });

    it('company admin at Company A cannot create a service in a Company B shop', async () => {
      const response = await request(
        token('company_admin', { companyId: fixture.companyA.id }),
        {
          method: 'POST',
          url: `/shops/${fixture.shopB.slug}/services`,
          payload: { name: 'Cross-company service', duration: 30, price: 5_000 },
        }
      );

      expect(response.statusCode).toBe(403);
    });

    it('kiosk at Shop A cannot invoke an owner-only Shop B queue mutation', async () => {
      const response = await request(token('kiosk', { shopId: fixture.shopA.id }), {
        method: 'POST',
        url: `/shops/${fixture.shopB.slug}/recalculate`,
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
