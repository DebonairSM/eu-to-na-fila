import { pool } from '../db/index.js';
import { getShopBySlug } from '../lib/shop.js';

const FLUSH_INTERVAL_MS = 5 * 60 * 1000;  // 5 min
const BUCKET_MS = 60 * 60 * 1000;         // 1 hour
const KEY_SEP = '\x01';  // delimiter for in-memory key (slug never in request path)

/** Normalize API path to a short endpoint tag for grouping. */
function normalizeEndpoint(method: string, path: string): string {
  const p = path.split('?')[0] ?? '';
  // /api/shops/:slug/queue -> queue
  const shopMatch = p.match(/^\/api\/shops\/[^/]+\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?\/?$/);
  if (shopMatch) {
    const a = shopMatch[1] ?? 'other';
    const b = shopMatch[2];
    const c = shopMatch[3];
    if (b && c) return `${a}_${b}_${c}`.slice(0, 48);
    if (b) return `${a}_${b}`.slice(0, 48);
    return a.slice(0, 48);
  }
  // /api/companies/:id/... -> companies
  if (p.startsWith('/api/companies/')) return 'companies';
  if (p.startsWith('/api/company/')) return 'company';
  if (p.startsWith('/api/ads/')) return 'ads';
  if (p.startsWith('/api/auth')) return 'auth';
  return 'other';
}

/** Get current bucket start (hour, UTC). */
function getBucketStart(): Date {
  const t = Date.now();
  return new Date(Math.floor(t / BUCKET_MS) * BUCKET_MS);
}

export class UsageService {
  private counters = new Map<string, number>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Record one API request. Synchronous and in-memory only (fire-and-forget safe).
   * Slug resolution happens in flush(), not on the request path.
   */
  recordRequest(slug: string | null, method: string, path: string): void {
    const tag = normalizeEndpoint(method, path);
    const bucketStart = getBucketStart();
    const slugPart = slug ?? 'g';
    const key = [slugPart, bucketStart.getTime(), tag, method].join(KEY_SEP);
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  /** Flush in-memory counters to DB and clear. Resolves slugs here, off the request path. */
  async flush(): Promise<void> {
    if (this.counters.size === 0) return;

    const snapshot = new Map(this.counters);
    this.counters.clear();

    const slugToIds = new Map<string, { shopId: number; companyId: number | null }>();
    const uniqueSlugs = new Set<string>();
    for (const key of snapshot.keys()) {
      const parts = key.split(KEY_SEP);
      if (parts.length < 4) continue;
      const [slugPart] = parts;
      if (slugPart !== 'g') uniqueSlugs.add(slugPart);
    }

    for (const slug of uniqueSlugs) {
      try {
        const shop = await getShopBySlug(slug);
        if (shop) slugToIds.set(slug, { shopId: shop.id, companyId: shop.companyId });
      } catch {
        // skip invalid slug
      }
    }

    const rows: { shopId: number | null; companyId: number | null; bucketStart: Date; endpointTag: string; method: string; requestCount: number }[] = [];
    for (const [key, count] of snapshot) {
      const parts = key.split(KEY_SEP);
      if (parts.length < 4) continue;
      const [slugPart, ts, tag, method] = parts;
      const bucketStart = new Date(parseInt(ts, 10));
      if (isNaN(bucketStart.getTime())) continue;

      let shopId: number | null = null;
      let companyId: number | null = null;
      if (slugPart !== 'g') {
        const ids = slugToIds.get(slugPart);
        if (!ids) continue; // skip unresolved slug to avoid noise
        shopId = ids.shopId;
        companyId = ids.companyId;
      }

      rows.push({
        shopId,
        companyId,
        bucketStart,
        endpointTag: tag,
        method,
        requestCount: count,
      });
    }

    for (const row of rows) {
      await pool.query(
        `INSERT INTO api_usage_buckets (shop_id, company_id, bucket_start, endpoint_tag, method, request_count)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ((COALESCE(shop_id, -1)), (COALESCE(company_id, -1)), bucket_start, endpoint_tag, method)
         DO UPDATE SET request_count = api_usage_buckets.request_count + EXCLUDED.request_count`,
        [
          row.shopId,
          row.companyId,
          row.bucketStart.toISOString(),
          row.endpointTag,
          row.method,
          row.requestCount,
        ]
      );
    }
  }

  /** Start periodic flush job. */
  startFlushJob(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => {
        console.error('[UsageService] Flush failed:', err?.message ?? err);
      });
    }, FLUSH_INTERVAL_MS);
  }

  stopFlushJob(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /** Extract shop slug from request path /api/shops/:slug/... or return null. */
  static getShopSlugFromPath(path: string): string | null {
    const match = path.match(/^\/api\/shops\/([^/]+)(?:\/|$)/);
    return match ? match[1] : null;
  }
}

let usageServiceInstance: UsageService | null = null;

export function getUsageService(): UsageService {
  if (!usageServiceInstance) {
    usageServiceInstance = new UsageService();
  }
  return usageServiceInstance;
}
