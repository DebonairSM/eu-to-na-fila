/**
 * Shape a ticket (with optional Drizzle-loaded relations) for API response.
 * Ensures service is sent as { id, name } when present.
 */
export function shapeTicketResponse(ticket: Record<string, unknown>): Record<string, unknown> {
  const s = ticket.service;
  const service =
    s && typeof s === 'object' && 'id' in s && 'name' in s
      ? { id: (s as { id: number }).id, name: (s as { name: string }).name }
      : undefined;
  const { service: _drop, ...rest } = ticket;
  return service ? { ...rest, service } : rest;
}
