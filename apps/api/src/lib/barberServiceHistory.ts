import { db, schema } from '../db/index.js';
import { eq, and, gte, lt, inArray, desc, sql } from 'drizzle-orm';
import { allServiceIdsForTicket } from './ticketServices.js';

export { allServiceIdsForTicket };

export interface BarberServiceHistoryTicketRow {
  id: number;
  serviceId: number;
  serviceName: string;
  serviceNames: string[];
  clientDisplayName: string;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMinutes: number | null;
}

export async function fetchBarberServiceHistoryPage(params: {
  shopId: number;
  companyId: number | null;
  barberId: number;
  sinceStr?: string;
  untilStr?: string;
  page: number;
  limit: number;
}): Promise<{ tickets: BarberServiceHistoryTicketRow[]; total: number }> {
  const { shopId, companyId, barberId, sinceStr, untilStr, page, limit } = params;

  const conditions = [eq(schema.tickets.shopId, shopId), eq(schema.tickets.barberId, barberId)];
  if (sinceStr != null) {
    conditions.push(gte(schema.tickets.createdAt, new Date(sinceStr + 'T00:00:00.000Z')));
  }
  if (untilStr != null) {
    const untilDate = new Date(untilStr + 'T00:00:00.000Z');
    untilDate.setUTCDate(untilDate.getUTCDate() + 1);
    conditions.push(lt(schema.tickets.createdAt, untilDate));
  }
  const whereClause = and(...conditions);

  const [ticketRows, countRows] = await Promise.all([
    db.query.tickets.findMany({
      where: whereClause,
      orderBy: [desc(schema.tickets.createdAt)],
      offset: (page - 1) * limit,
      limit,
      columns: {
        id: true,
        serviceId: true,
        mainServiceId: true,
        complementaryServiceIds: true,
        customerName: true,
        clientId: true,
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
    where: eq(schema.services.shopId, shopId),
    columns: { id: true, name: true },
  });
  const serviceNameMap = new Map(services.map((s) => [s.id, s.name]));

  const clientIds = [...new Set(ticketRows.map((t) => t.clientId).filter((id): id is number => id != null))];
  let clientNameMap = new Map<number, string>();
  if (clientIds.length > 0) {
    const clientWhere =
      companyId != null
        ? and(inArray(schema.clients.id, clientIds), eq(schema.clients.companyId, companyId))
        : inArray(schema.clients.id, clientIds);
    const clientRows = await db.query.clients.findMany({
      where: clientWhere,
      columns: { id: true, name: true },
    });
    clientNameMap = new Map(clientRows.map((c) => [c.id, c.name]));
  }

  const tickets: BarberServiceHistoryTicketRow[] = ticketRows.map((t) => {
    const ids = allServiceIdsForTicket({
      serviceId: t.serviceId,
      mainServiceId: t.mainServiceId,
      complementaryServiceIds: t.complementaryServiceIds,
    });
    const serviceNames = ids.map((id) => serviceNameMap.get(id) ?? `Service ${id}`);
    const primaryId = t.mainServiceId ?? ids[0] ?? t.serviceId;
    let durationMinutes: number | null = null;
    if (t.completedAt && t.startedAt) {
      const mins = (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / (1000 * 60);
      if (mins > 0 && mins < 120) durationMinutes = Math.round(mins);
    }
    const clientDisplayName =
      t.clientId != null ? (clientNameMap.get(t.clientId) ?? t.customerName) : t.customerName;
    return {
      id: t.id,
      serviceId: primaryId,
      serviceName: serviceNames[0] ?? `Service ${primaryId}`,
      serviceNames,
      clientDisplayName,
      status: t.status,
      createdAt: t.createdAt,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      durationMinutes,
    };
  });

  return { tickets, total };
}
