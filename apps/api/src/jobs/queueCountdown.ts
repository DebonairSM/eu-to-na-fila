import { db, schema } from '../db/index.js';
import { eq, or } from 'drizzle-orm';
import { ticketService } from '../services/TicketService.js';

const RECALC_INTERVAL_MS = 60_000; // 60 seconds
let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Recalculate wait times for every shop that has active tickets.
 * Runs on an interval so stored wait times tick down as time passes,
 * instead of jumping from e.g. 20 to 0 only on status-change events.
 */
async function recalculateActiveShops(): Promise<void> {
  try {
    // Find distinct shopIds that have at least one waiting or in_progress ticket
    const activeTickets = await db.query.tickets.findMany({
      where: or(
        eq(schema.tickets.status, 'waiting'),
        eq(schema.tickets.status, 'in_progress')
      ),
      columns: { shopId: true },
    });

    const shopIds = [...new Set(activeTickets.map(t => t.shopId))];

    for (const shopId of shopIds) {
      try {
        await ticketService.recalculateShopQueue(shopId);
      } catch (err) {
        // Log but don't crash the interval if one shop fails
        console.error(`[queueCountdown] Failed to recalculate shop ${shopId}:`, err);
      }
    }
  } catch (err) {
    console.error('[queueCountdown] Failed to run periodic recalculation:', err);
  }
}

/**
 * Start the periodic queue recalculation job.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function startQueueCountdown(): void {
  if (intervalId !== null) return;

  intervalId = setInterval(recalculateActiveShops, RECALC_INTERVAL_MS);

  // Prevent the interval from keeping the process alive if everything else shuts down
  if (intervalId && typeof intervalId === 'object' && 'unref' in intervalId) {
    intervalId.unref();
  }

  console.log(`[queueCountdown] Started — recalculating active shops every ${RECALC_INTERVAL_MS / 1000}s`);
}

/**
 * Stop the periodic queue recalculation job.
 */
export function stopQueueCountdown(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[queueCountdown] Stopped');
  }
}
