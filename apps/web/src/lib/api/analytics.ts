import type { BaseApiClient } from './client.js';

export type AnalyticsQuery = number | { days?: number; since?: string; until?: string };

export interface AnalyticsApi {
  getAnalytics(shopSlug: string, options?: AnalyticsQuery): Promise<any>;
  getBarberAnalytics(shopSlug: string, days?: number): Promise<any>;
}

const ANALYTICS_TIMEOUT_MS = 45000;

export function createAnalyticsApi(client: BaseApiClient): AnalyticsApi {
  const c = client as any;
  return {
    getAnalytics: (shopSlug, options) => {
      const opts = typeof options === 'number' ? { days: options } : options;
      if (opts != null && opts.since != null && opts.until != null) {
        return c.get(`/shops/${shopSlug}/analytics?since=${encodeURIComponent(opts.since)}&until=${encodeURIComponent(opts.until)}`, ANALYTICS_TIMEOUT_MS);
      }
      const d = opts != null && typeof opts.days === 'number' ? opts.days : 7;
      return c.get(`/shops/${shopSlug}/analytics?days=${d}`, ANALYTICS_TIMEOUT_MS);
    },
    getBarberAnalytics: (shopSlug, days) => {
      const d = typeof days === 'number' ? days : 7;
      return c.get(`/shops/${shopSlug}/analytics/me?days=${d}`, ANALYTICS_TIMEOUT_MS);
    },
  };
}
