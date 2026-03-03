import { db, schema } from '../db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { getBarberPresenceWindow } from '@eutonafila/shared';
import { parseSettings } from '../lib/settings.js';

const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * For each shop, if current time is >= closing + 1h (per getBarberPresenceWindow),
 * set all barbers in that shop to isPresent: false and unassign any in-progress
 * tickets. Barbers are never auto-set to present when the shop reopens.
 */
async function runBarberAutoAbsent(): Promise<void> {
  try {
    const shops = await db.query.shops.findMany({
      columns: { id: true, settings: true },
    });
    const now = new Date();

    for (const shop of shops) {
      try {
        const settings = parseSettings(shop.settings);
        const timezone = settings.timezone ?? 'America/Sao_Paulo';
        const { shouldAutoAbsent } = getBarberPresenceWindow(
          settings.operatingHours,
          timezone,
          now,
          settings.temporaryStatusOverride ?? undefined
        );

        if (!shouldAutoAbsent) continue;

        const barbersInShop = await db.query.barbers.findMany({
          where: and(
            eq(schema.barbers.shopId, shop.id),
            eq(schema.barbers.isPresent, true)
          ),
          columns: { id: true },
        });
        if (barbersInShop.length === 0) continue;

        const barberIds = barbersInShop.map((b) => b.id);

        await db
          .update(schema.tickets)
          .set({
            barberId: null,
            status: 'waiting',
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.tickets.shopId, shop.id),
              inArray(schema.tickets.barberId, barberIds),
              eq(schema.tickets.status, 'in_progress')
            )
          );

        await db
          .update(schema.barbers)
          .set({ isPresent: false, updatedAt: now })
          .where(
            and(
              eq(schema.barbers.shopId, shop.id),
              eq(schema.barbers.isPresent, true)
            )
          );
      } catch (err) {
        console.error(`[barberPresenceJob] Failed for shop ${shop.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[barberPresenceJob] Run failed:', err);
  }
}

/**
 * Start the periodic barber auto-absent job.
 * Barbers are set absent automatically 1h after closing; they are never set present automatically.
 */
export function startBarberPresenceJob(): void {
  if (intervalId !== null) return;

  runBarberAutoAbsent();

  intervalId = setInterval(runBarberAutoAbsent, INTERVAL_MS);

  if (intervalId && typeof intervalId === 'object' && 'unref' in intervalId) {
    (intervalId as NodeJS.Timeout).unref();
  }

  console.log(`[barberPresenceJob] Started — auto-absent barbers 1h after closing every ${INTERVAL_MS / 60_000}min`);
}

export function stopBarberPresenceJob(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[barberPresenceJob] Stopped');
  }
}
