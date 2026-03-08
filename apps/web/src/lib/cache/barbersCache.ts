import type { Barber } from '@eutonafila/shared';

const DEFAULT_MAX_AGE_MS = 2 * 60 * 1000; // 2 minutes

interface CacheEntry {
  data: Barber[];
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Get cached barbers for a shop. Returns undefined if missing or stale.
 */
export function getCachedBarbers(
  shopSlug: string,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): Barber[] | undefined {
  const entry = cache.get(shopSlug);
  if (!entry) return undefined;
  if (Date.now() - entry.fetchedAt > maxAgeMs) return undefined;
  return entry.data;
}

/**
 * Store barbers in cache for a shop.
 */
export function setCachedBarbers(shopSlug: string, data: Barber[]): void {
  cache.set(shopSlug, { data, fetchedAt: Date.now() });
}

/**
 * Clear cached barbers for one shop or all. Call after create/update/delete.
 */
export function invalidateBarbersCache(shopSlug?: string): void {
  if (shopSlug === undefined) {
    cache.clear();
  } else {
    cache.delete(shopSlug);
  }
}
