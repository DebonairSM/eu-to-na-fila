/**
 * Safely format a value for JSON response (e.g. Date -> ISO string).
 */
function toJsonValue(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
    const o = v as Record<string, unknown>;
    if (typeof o.id === 'number' && typeof o.name === 'string') return { id: o.id, name: o.name };
  }
  return v;
}

/**
 * Shape a ticket (with optional Drizzle-loaded relations) for API response.
 * Ensures service is sent as { id, name } when present.
 * Builds a plain serializable object to avoid circular refs or getter errors.
 */
export function shapeTicketResponse(ticket: Record<string, unknown>): Record<string, unknown> {
  const s = ticket.service;
  const service =
    s && typeof s === 'object' && 'id' in s && 'name' in s
      ? { id: (s as { id: number }).id, name: (s as { name: string }).name }
      : undefined;

  const keys = [
    'id', 'shopId', 'serviceId', 'barberId', 'preferredBarberId', 'clientId', 'customerName', 'customerPhone',
    'deviceId', 'status', 'position', 'estimatedWaitTime', 'type', 'scheduledTime', 'checkInTime',
    'ticketNumber', 'createdAt', 'updatedAt', 'startedAt', 'completedAt', 'cancelledAt', 'barberAssignedAt',
  ] as const;
  const out: Record<string, unknown> = {};

  for (const k of keys) {
    if (k in ticket && ticket[k] !== undefined) {
      out[k] = toJsonValue(ticket[k]);
    }
  }

  if (service) out.service = service;

  const shop = ticket.shop;
  if (shop && typeof shop === 'object' && 'slug' in shop && typeof (shop as { slug: string }).slug === 'string') {
    out.shopSlug = (shop as { slug: string }).slug;
  }

  const client = ticket.client;
  if (client && typeof client === 'object' && 'city' in client) {
    const c = client as { city?: string | null; state?: string | null };
    if (c.city != null && c.city !== '') out.clientCity = c.city;
    if (c.state != null && c.state !== '') out.clientState = c.state;
  }

  return out;
}
