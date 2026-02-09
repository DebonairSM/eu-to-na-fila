import type { BaseApiClient } from './client.js';

export interface AnalyticsApi {
  getAnalytics(shopSlug: string, days?: number): Promise<any>;
  getBarberAnalytics(shopSlug: string, days?: number): Promise<any>;
}

export function createAnalyticsApi(client: BaseApiClient): AnalyticsApi {
  const c = client as any;
  return {
    getAnalytics: (shopSlug, days) => {
      const d = typeof days === 'number' ? days : 7;
      return c.get(`/shops/${shopSlug}/analytics?days=${d}`);
    },
    getBarberAnalytics: (shopSlug, days) => {
      const d = typeof days === 'number' ? days : 7;
      return c.get(`/shops/${shopSlug}/analytics/me?days=${d}`);
    },
  };
}
