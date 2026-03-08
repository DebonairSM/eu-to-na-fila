import type { Service } from '@eutonafila/shared';

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: Service[];
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Get cached services for a shop. Returns undefined if missing or stale.
 */
export function getCachedServices(
  shopSlug: string,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): Service[] | undefined {
  const entry = cache.get(shopSlug);
  if (!entry) return undefined;
  if (Date.now() - entry.fetchedAt > maxAgeMs) return undefined;
  return entry.data;
}

/**
 * Store services in cache for a shop.
 */
export function setCachedServices(shopSlug: string, data: Service[]): void {
  cache.set(shopSlug, { data, fetchedAt: Date.now() });
}

/**
 * Clear cached services for one shop or all. Call after create/update/delete/reorder.
 */
export function invalidateServicesCache(shopSlug?: string): void {
  if (shopSlug === undefined) {
    cache.clear();
  } else {
    cache.delete(shopSlug);
  }
}
