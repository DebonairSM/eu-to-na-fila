import { db, schema } from '../../db/index.js';
import type { InferSelectModel } from 'drizzle-orm';
import type { shops, services, barbers, tickets } from '../../db/schema.js';

type Shop = InferSelectModel<typeof shops>;
type Service = InferSelectModel<typeof services>;
type Barber = InferSelectModel<typeof barbers>;
type Ticket = InferSelectModel<typeof tickets>;

interface CreateShopData {
  slug?: string;
  name?: string;
  domain?: string;
  path?: string;
  apiBase?: string;
  ownerPinHash?: string;
  staffPinHash?: string;
}

interface CreateServiceData {
  shopId: number;
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  isActive?: boolean;
}

interface CreateBarberData {
  shopId: number;
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  isPresent?: boolean;
}

interface CreateTicketData {
  shopId: number;
  serviceId: number;
  customerName?: string;
  customerPhone?: string;
  barberId?: number | null;
  preferredBarberId?: number | null;
  status?: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  position?: number;
  estimatedWaitTime?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  barberAssignedAt?: Date | null;
}

/**
 * Create a test shop
 */
export async function createShop(data: CreateShopData = {}): Promise<Shop> {
  const [shop] = await db
    .insert(schema.shops)
    .values({
      slug: data.slug || `test-shop-${Date.now()}`,
      name: data.name || 'Test Shop',
      domain: data.domain || 'test.com',
      path: data.path || '/test',
      apiBase: data.apiBase || 'https://test.com',
      ownerPinHash: data.ownerPinHash || 'test-owner-hash',
      staffPinHash: data.staffPinHash || 'test-staff-hash',
      ownerPinResetRequired: false,
      staffPinResetRequired: false,
    })
    .returning();

  return shop;
}

/**
 * Create a test service
 */
export async function createService(data: CreateServiceData): Promise<Service> {
  const [service] = await db
    .insert(schema.services)
    .values({
      shopId: data.shopId,
      name: data.name || 'Test Service',
      description: data.description || 'Test service description',
      duration: data.duration || 30,
      price: data.price || 3000,
      isActive: data.isActive !== undefined ? data.isActive : true,
    })
    .returning();

  return service;
}

/**
 * Create a test barber
 */
export async function createBarber(data: CreateBarberData): Promise<Barber> {
  const [barber] = await db
    .insert(schema.barbers)
    .values({
      shopId: data.shopId,
      name: data.name || `Barber ${Date.now()}`,
      email: data.email,
      phone: data.phone,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isPresent: data.isPresent !== undefined ? data.isPresent : true,
    })
    .returning();

  return barber;
}

/**
 * Create a test ticket
 */
export async function createTicket(data: CreateTicketData): Promise<Ticket> {
  const now = new Date();
  const [ticket] = await db
    .insert(schema.tickets)
    .values({
      shopId: data.shopId,
      serviceId: data.serviceId,
      customerName: data.customerName || `Customer ${Date.now()}`,
      customerPhone: data.customerPhone,
      barberId: data.barberId ?? null,
      preferredBarberId: data.preferredBarberId ?? null,
      status: data.status || 'waiting',
      position: data.position ?? 0,
      estimatedWaitTime: data.estimatedWaitTime ?? null,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      startedAt: data.startedAt ?? null,
      completedAt: data.completedAt ?? null,
      cancelledAt: data.cancelledAt ?? null,
      barberAssignedAt: data.barberAssignedAt ?? null,
    })
    .returning();

  return ticket;
}

/**
 * Helper to create a complete test scenario
 */
export async function createTestScenario(options: {
  shop?: CreateShopData;
  services?: Omit<CreateServiceData, 'shopId'>[];
  barbers?: Omit<CreateBarberData, 'shopId'>[];
}) {
  const shop = await createShop(options.shop);
  
  const services = options.services
    ? await Promise.all(
        options.services.map((s) => createService({ ...s, shopId: shop.id }))
      )
    : [];

  const barbers = options.barbers
    ? await Promise.all(
        options.barbers.map((b) => createBarber({ ...b, shopId: shop.id }))
      )
    : [];

  return { shop, services, barbers };
}

