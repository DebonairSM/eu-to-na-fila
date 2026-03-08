export type WaitTimesData = {
  standardWaitTime: number | null;
  barberWaitTimes: Array<{
    barberId: number;
    barberName: string;
    waitTime: number | null;
    isPresent: boolean;
  }>;
};

const DEFAULT_MAX_AGE_MS = 45 * 1000; // 45 seconds

interface CacheEntry {
  data: WaitTimesData;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedWaitTimes(
  shopSlug: string,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): WaitTimesData | undefined {
  const entry = cache.get(shopSlug);
  if (!entry) return undefined;
  if (Date.now() - entry.fetchedAt > maxAgeMs) return undefined;
  return entry.data;
}

export function setCachedWaitTimes(shopSlug: string, data: WaitTimesData): void {
  cache.set(shopSlug, { data, fetchedAt: Date.now() });
}
