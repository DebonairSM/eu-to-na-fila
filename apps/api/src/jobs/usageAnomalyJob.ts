import { db, schema } from '../db/index.js';
import { eq, and, gte, lt, sql, isNull } from 'drizzle-orm';

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const SPIKES_RATIO = 8;              // alert when current > 8x baseline (tuned for multi-device normal usage)
const MIN_REQUESTS = 50;            // only alert if current period has at least this many
const PERIOD_MS = 60 * 60 * 1000;   // 1 hour

let intervalId: ReturnType<typeof setInterval> | null = null;

export async function runUsageAnomalyCheck(): Promise<void> {
  const now = new Date();
  const periodEnd = new Date(Math.floor(now.getTime() / PERIOD_MS) * PERIOD_MS);
  const periodStart = new Date(periodEnd.getTime() - PERIOD_MS);
  const baselineEnd = periodStart;
  const baselineStart = new Date(baselineEnd.getTime() - PERIOD_MS);

  const shops = await db.query.shops.findMany({
    where: sql`${schema.shops.companyId} IS NOT NULL`,
    columns: { id: true, companyId: true },
  });

  for (const shop of shops) {
    const companyId = shop.companyId ?? 0;
    if (companyId <= 0) continue;

    const currentRows = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.apiUsageBuckets.requestCount}), 0)` })
      .from(schema.apiUsageBuckets)
      .where(
        and(
          eq(schema.apiUsageBuckets.shopId, shop.id),
          gte(schema.apiUsageBuckets.bucketStart, periodStart),
          lt(schema.apiUsageBuckets.bucketStart, periodEnd)
        )
      );
    const current = Number(currentRows[0]?.total ?? 0);

    const baselineRows = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.apiUsageBuckets.requestCount}), 0)` })
      .from(schema.apiUsageBuckets)
      .where(
        and(
          eq(schema.apiUsageBuckets.shopId, shop.id),
          gte(schema.apiUsageBuckets.bucketStart, baselineStart),
          lt(schema.apiUsageBuckets.bucketStart, baselineEnd)
        )
      );
    const baseline = Number(baselineRows[0]?.total ?? 0);

    if (current < MIN_REQUESTS) continue;
    if (baseline <= 0) continue;
    if (current / baseline <= SPIKES_RATIO) continue;

    const existing = await db.query.usageAlerts.findFirst({
      where: and(
        eq(schema.usageAlerts.shopId, shop.id),
        isNull(schema.usageAlerts.resolvedAt),
        gte(schema.usageAlerts.periodEnd, baselineStart)
      ),
    });
    if (existing) continue;

    await db.insert(schema.usageAlerts).values({
      shopId: shop.id,
      companyId,
      triggeredAt: now,
      periodStart,
      periodEnd,
      requestCount: current,
      baselineCount: baseline,
      reason: 'spike',
    });
  }
}

export function startUsageAnomalyJob(): void {
  if (intervalId) return;
  runUsageAnomalyCheck().catch((err) => {
    console.error('[usageAnomalyJob] Initial run failed:', err?.message ?? err);
  });
  intervalId = setInterval(() => {
    runUsageAnomalyCheck().catch((err) => {
      console.error('[usageAnomalyJob] Run failed:', err?.message ?? err);
    });
  }, INTERVAL_MS);
}

export function stopUsageAnomalyJob(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
