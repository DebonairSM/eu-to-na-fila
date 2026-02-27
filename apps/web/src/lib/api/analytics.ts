import type { BaseApiClient } from './client.js';

export type AnalyticsQuery = number | { days?: number; since?: string; until?: string };

export interface BarberServiceHistoryTicket {
  id: number;
  serviceId: number;
  serviceName: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMinutes: number | null;
}

export interface BarberServiceHistoryResponse {
  tickets: BarberServiceHistoryTicket[];
  total: number;
}

export interface BarberServiceHistoryParams {
  since?: string;
  until?: string;
  page?: number;
  limit?: number;
}

export interface BarberProductivityByDayRow {
  barberId: number;
  barberName: string;
  dayOfWeek: number;
  dayName: string;
  avgDurationMinutes: number;
  totalCompleted: number;
}

export interface BarberProductivityByWeekResponse {
  weekStart: string;
  weekEnd: string;
  barberProductivityByDay: BarberProductivityByDayRow[];
}

export interface AnalyticsApi {
  getAnalytics(shopSlug: string, options?: AnalyticsQuery): Promise<any>;
  getBarberAnalytics(shopSlug: string, days?: number): Promise<any>;
  getBarberProductivityByWeek(shopSlug: string, weekStart: string): Promise<BarberProductivityByWeekResponse>;
  getBarberServiceHistory(
    shopSlug: string,
    barberId: number,
    params?: BarberServiceHistoryParams
  ): Promise<BarberServiceHistoryResponse>;
}

const ANALYTICS_TIMEOUT_MS = 45000;

function buildQueryString(params: BarberServiceHistoryParams): string {
  const search = new URLSearchParams();
  if (params.since != null) search.set('since', params.since);
  if (params.until != null) search.set('until', params.until);
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

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
    getBarberProductivityByWeek: (shopSlug, weekStart) => {
      return c.get(`/shops/${shopSlug}/analytics/barber-productivity-by-week?weekStart=${encodeURIComponent(weekStart)}`, ANALYTICS_TIMEOUT_MS);
    },
    getBarberServiceHistory: (shopSlug, barberId, params) => {
      const qs = buildQueryString(params ?? {});
      return c.get(`/shops/${shopSlug}/analytics/barbers/${barberId}/history${qs}`, ANALYTICS_TIMEOUT_MS);
    },
  };
}
