/**
 * Ticket service selection: one row can represent a main service plus complementary (child) services.
 * Frontend sends the full ordered list in complementaryServiceIds; serviceId is the FK anchor (main when kind=main exists).
 */

export type TicketServiceBundle = {
  serviceId: number;
  mainServiceId?: number | null;
  complementaryServiceIds?: number[] | null;
};

/** Dedupe IDs while preserving first-seen order. */
export function dedupePreserveOrder(ids: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * All catalog service IDs for this visit (for wait sums, stats, revenue).
 * When complementaryServiceIds is non-empty it holds the full customer selection (same as join/kiosk payload).
 */
export function allServiceIdsForTicket(t: TicketServiceBundle): number[] {
  const extra = t.complementaryServiceIds;
  if (extra && extra.length > 0) return dedupePreserveOrder(extra);
  return [t.serviceId];
}

/** Sum per-service durations (e.g. barber averages or catalog minutes) for the whole bundle. */
export function totalBundleMinutes(
  t: TicketServiceBundle,
  getDurationMinutes: (serviceId: number, barberId?: number) => number,
  barberId?: number
): number {
  return allServiceIdsForTicket(t).reduce(
    (sum, sid) => sum + getDurationMinutes(sid, barberId),
    0
  );
}

/** Add every service id from the ticket into the set (for loading barber stats / duration maps). */
export function addBundleServiceIdsToSet(t: TicketServiceBundle, into: Set<number>): void {
  for (const id of allServiceIdsForTicket(t)) into.add(id);
}

/**
 * Resolve DB columns from the shop's ordered selection and service kinds (owner: main vs complementary).
 * - mainServiceId: first selected service with kind === 'main', else null.
 * - serviceId: mainServiceId ?? first selected (FK anchor for relations / legacy).
 * - complementaryServiceIds: full ordered selection (deduped) for display and bundle math.
 */
export function resolveTicketServiceColumns(
  orderedUniqueIds: number[],
  kindByServiceId: Map<number, string>
): { serviceId: number; mainServiceId: number | null; complementaryServiceIds: number[] } {
  if (orderedUniqueIds.length === 0) {
    throw new Error('resolveTicketServiceColumns: empty selection');
  }
  const mainServiceId =
    orderedUniqueIds.find((id) => (kindByServiceId.get(id) ?? 'complementary') === 'main') ?? null;
  const serviceId = mainServiceId ?? orderedUniqueIds[0];
  return {
    serviceId,
    mainServiceId,
    complementaryServiceIds: orderedUniqueIds,
  };
}
