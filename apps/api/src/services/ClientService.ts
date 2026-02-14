import type { DbClient } from '../db/types.js';
import { schema } from '../db/index.js';
import { eq, and, or, like, desc, inArray, sql } from 'drizzle-orm';
import { NotFoundError } from '../lib/errors.js';

export interface ClientListItem {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  ticketCount: number;
}

/**
 * Normalize phone to digits only for consistent matching.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export interface Client {
  id: number;
  shopId: number;
  phone: string;
  name: string;
  email: string | null;
  address: string | null;
  dateOfBirth: Date | string | null;
  gender: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientClipNote {
  id: number;
  clientId: number;
  barberId: number;
  note: string;
  createdAt: Date;
  barber?: { name: string };
}

/**
 * Service for managing client operations.
 */
export class ClientService {
  constructor(private db: DbClient) {}

  /**
   * Find or create a client by phone. Updates name on existing client (last-seen wins).
   */
  async findOrCreateByPhone(
    shopId: number,
    phone: string,
    name: string,
    email?: string | null
  ): Promise<Client> {
    const normalized = normalizePhone(phone);
    if (!normalized) throw new Error('Invalid phone');

    const existing = await this.db.query.clients.findFirst({
      where: and(
        eq(schema.clients.shopId, shopId),
        eq(schema.clients.phone, normalized)
      ),
    });

    const now = new Date();
    if (existing) {
      await this.db
        .update(schema.clients)
        .set({
          name,
          ...(email !== undefined ? { email: email ?? null } : {}),
          updatedAt: now,
        })
        .where(eq(schema.clients.id, existing.id));
      return {
        ...existing,
        name,
        email: email !== undefined ? (email ?? null) : existing.email,
        updatedAt: now,
      } as Client;
    }

    const [created] = await this.db
      .insert(schema.clients)
      .values({
        shopId,
        phone: normalized,
        name,
        email: email ?? null,
      })
      .returning();
    return created as Client;
  }

  /**
   * Find client by normalized phone (for remember lookup).
   */
  async findByPhone(shopId: number, phone: string): Promise<Client | null> {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    const client = await this.db.query.clients.findFirst({
      where: and(
        eq(schema.clients.shopId, shopId),
        eq(schema.clients.phone, normalized)
      ),
    });
    return client as Client | null;
  }

  async getById(id: number): Promise<Client | null> {
    const client = await this.db.query.clients.findFirst({
      where: eq(schema.clients.id, id),
    });
    return client as Client | null;
  }

  async getByIdWithShopCheck(id: number, shopId: number): Promise<Client | null> {
    const client = await this.db.query.clients.findFirst({
      where: and(
        eq(schema.clients.id, id),
        eq(schema.clients.shopId, shopId)
      ),
    });
    return client as Client | null;
  }

  async search(shopId: number, q: string, limit = 20): Promise<Client[]> {
    const trimmed = q.trim();
    if (!trimmed) return [];

    const normalized = normalizePhone(trimmed);
    const searchPattern = `%${trimmed}%`;
    const conditions = [like(schema.clients.name, searchPattern)];
    if (normalized.length >= 3) {
      conditions.push(like(schema.clients.phone, `%${normalized}%`));
    }

    const clients = await this.db.query.clients.findMany({
      where: and(eq(schema.clients.shopId, shopId), or(...conditions)),
      limit,
      orderBy: [desc(schema.clients.updatedAt)],
    });
    return clients as Client[];
  }

  /**
   * List all clients for a shop with ticket count. Paginated. Owner-only.
   */
  async listByShop(
    shopId: number,
    opts: { page: number; limit: number }
  ): Promise<{ clients: ClientListItem[]; total: number }> {
    const { page, limit } = opts;
    const offset = Math.max(0, (page - 1) * limit);

    const [totalRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.clients)
      .where(eq(schema.clients.shopId, shopId));
    const total = totalRow?.count ?? 0;

    const clients = await this.db.query.clients.findMany({
      where: eq(schema.clients.shopId, shopId),
      columns: { id: true, name: true, phone: true, email: true, createdAt: true },
      orderBy: [desc(schema.clients.updatedAt)],
      limit,
      offset,
    });

    if (clients.length === 0) {
      return { clients: [], total };
    }

    const clientIds = clients.map((c) => c.id);
    const ticketCountRows = await this.db
      .select({
        clientId: schema.tickets.clientId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.tickets)
      .where(
        and(
          eq(schema.tickets.shopId, shopId),
          inArray(schema.tickets.clientId, clientIds)
        )
      )
      .groupBy(schema.tickets.clientId);

    const countMap = new Map<number, number>();
    for (const row of ticketCountRows) {
      if (row.clientId != null) {
        countMap.set(row.clientId, row.count);
      }
    }

    const result: ClientListItem[] = clients.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      createdAt: c.createdAt,
      ticketCount: countMap.get(c.id) ?? 0,
    }));

    return { clients: result, total };
  }

  async update(id: number, shopId: number, data: { name?: string; email?: string | null }): Promise<Client> {
    const client = await this.getByIdWithShopCheck(id, shopId);
    if (!client) throw new NotFoundError('Client not found');

    const [updated] = await this.db
      .update(schema.clients)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.clients.id, id))
      .returning();
    return updated as Client;
  }

  /**
   * Update customer profile (self-service). Handles name, phone, preferences, reference note/image.
   */
  async updateCustomerProfile(
    id: number,
    shopId: number,
    data: {
      name?: string;
      phone?: string | null;
      preferences?: { emailReminders?: boolean };
      nextServiceNote?: string | null;
      nextServiceImageUrl?: string | null;
      address?: string | null;
      dateOfBirth?: string | null;
      gender?: string | null;
    }
  ): Promise<Client> {
    const client = await this.getByIdWithShopCheck(id, shopId);
    if (!client) throw new NotFoundError('Client not found');

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined && data.name.trim().length > 0) {
      updateData.name = data.name.trim();
    }
    if (data.phone !== undefined && data.phone != null && data.phone.trim() !== '') {
      const normalized = normalizePhone(data.phone);
      if (normalized) updateData.phone = normalized;
    }
    if (data.preferences !== undefined) {
      const current = (client as { preferences?: Record<string, unknown> }).preferences ?? {};
      const merged = { ...current, ...data.preferences };
      updateData.preferences = merged;
    }
    if (data.nextServiceNote !== undefined) {
      updateData.nextServiceNote = data.nextServiceNote === '' ? null : data.nextServiceNote;
    }
    if (data.nextServiceImageUrl !== undefined) {
      updateData.nextServiceImageUrl = data.nextServiceImageUrl === '' ? null : data.nextServiceImageUrl;
    }
    if (data.address !== undefined) {
      updateData.address = data.address === '' ? null : data.address;
    }
    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth === '' || data.dateOfBirth == null ? null : data.dateOfBirth;
    }
    if (data.gender !== undefined) {
      updateData.gender = data.gender === '' ? null : data.gender;
    }

    const [updated] = await this.db
      .update(schema.clients)
      .set(updateData as Record<string, unknown>)
      .where(eq(schema.clients.id, id))
      .returning();
    return updated as Client;
  }

  async getClipNotes(clientId: number, shopId: number): Promise<ClientClipNote[]> {
    const client = await this.getByIdWithShopCheck(clientId, shopId);
    if (!client) throw new NotFoundError('Client not found');

    const notes = await this.db.query.clientClipNotes.findMany({
      where: eq(schema.clientClipNotes.clientId, clientId),
      with: { barber: { columns: { name: true } } },
      orderBy: [desc(schema.clientClipNotes.createdAt)],
    });
    return notes.map((n) => ({
      id: n.id,
      clientId: n.clientId,
      barberId: n.barberId,
      note: n.note,
      createdAt: n.createdAt,
      barber: n.barber ? { name: n.barber.name } : undefined,
    })) as ClientClipNote[];
  }

  async addClipNote(clientId: number, shopId: number, barberId: number, note: string): Promise<ClientClipNote> {
    const client = await this.getByIdWithShopCheck(clientId, shopId);
    if (!client) throw new NotFoundError('Client not found');

    const [created] = await this.db
      .insert(schema.clientClipNotes)
      .values({ clientId, barberId, note: note.trim() })
      .returning();

    const withBarber = await this.db.query.clientClipNotes.findFirst({
      where: eq(schema.clientClipNotes.id, created.id),
      with: { barber: { columns: { name: true } } },
    });
    return {
      id: created.id,
      clientId: created.clientId,
      barberId: created.barberId,
      note: created.note,
      createdAt: created.createdAt,
      barber: withBarber?.barber ? { name: withBarber.barber.name } : undefined,
    } as ClientClipNote;
  }

  async getServiceHistory(clientId: number, shopId: number): Promise<Array<{
    id: number;
    serviceName: string;
    barberName: string | null;
    completedAt: Date | null;
  }>> {
    const client = await this.getByIdWithShopCheck(clientId, shopId);
    if (!client) throw new NotFoundError('Client not found');

    const tickets = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.clientId, clientId),
        eq(schema.tickets.status, 'completed')
      ),
      with: {
        service: { columns: { name: true } },
        barber: { columns: { name: true } },
      },
      orderBy: [desc(schema.tickets.completedAt)],
    });

    return tickets.map((t) => ({
      id: t.id,
      serviceName: t.service?.name ?? 'Unknown',
      barberName: t.barber?.name ?? null,
      completedAt: t.completedAt,
    }));
  }
}
