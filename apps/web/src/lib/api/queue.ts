import type { GetQueueResponse, GetMetricsResponse, GetStatisticsResponse, Ticket } from '@eutonafila/shared';
import type { BaseApiClient } from './client.js';
import { API_TIMEOUT_WAIT_TIMES_MS } from '../constants';
import { ApiError } from './errors.js';

export interface QueueNextResponse {
  next: Ticket | null;
  deadZoneWarning?: { message: string; appointmentTicketNumber?: string };
}

export interface GetQueueOptions {
  scope?: 'full' | 'public' | 'status';
}

const queueEtagCache = new Map<string, string>();
const queueDataCache = new Map<string, GetQueueResponse>();

/** Queue + metrics domain methods. */
export interface QueueApi {
  getQueue(shopSlug: string, options?: GetQueueOptions): Promise<GetQueueResponse>;
  getQueueNext(shopSlug: string): Promise<QueueNextResponse>;
  getMetrics(shopSlug: string): Promise<GetMetricsResponse>;
  getWaitDebug(shopSlug: string): Promise<{ peopleAhead: number; activePresentBarbers: number; inProgressRemaining: number; sampleEstimateForNext: number }>;
  getWaitTimes(shopSlug: string): Promise<{ standardWaitTime: number | null; barberWaitTimes: Array<{ barberId: number; barberName: string; waitTime: number | null; isPresent: boolean }> }>;
  getStatistics(shopSlug: string, since?: Date): Promise<GetStatisticsResponse>;
  recalculate(shopSlug: string): Promise<{ ok: boolean }>;
}

export function createQueueApi(client: BaseApiClient): QueueApi {
  const c = client as any; // access protected methods
  return {
    getQueue: async (shopSlug, options) => {
      const scope = options?.scope && options.scope !== 'full' ? `?scope=${options.scope}` : '';
      const path = `/shops/${shopSlug}/queue${scope}`;
      const cacheKey = `queue:${shopSlug}:${options?.scope ?? 'full'}`;
      const headers: Record<string, string> = {};
      if (c.authToken) headers.Authorization = `Bearer ${c.authToken}`;
      const existingEtag = queueEtagCache.get(cacheKey);
      if (existingEtag) headers['If-None-Match'] = existingEtag;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let response: Response;
      try {
        response = await fetch(`${c.getBaseUrl()}${path}`, {
          method: 'GET',
          headers,
          cache: 'no-store',
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timeoutId);
        throw new ApiError(
          error instanceof Error && error.name === 'AbortError'
            ? 'Request timed out - please check your connection'
            : 'Network error - please check your connection',
          error instanceof Error && error.name === 'AbortError' ? 408 : 0,
          error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR'
        );
      }
      clearTimeout(timeoutId);

      if (response.status === 304) {
        const cached = queueDataCache.get(cacheKey);
        if (cached) return cached;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 401 && typeof c.onAuthError === 'function') {
          c.onAuthError();
        }
        throw new ApiError(
          errData.error || `Request failed (${response.status} ${response.statusText})`,
          response.status,
          errData.code || 'API_ERROR'
        );
      }

      const etag = response.headers.get('etag');
      if (etag) queueEtagCache.set(cacheKey, etag);
      const data = (await response.json()) as GetQueueResponse;
      queueDataCache.set(cacheKey, data);
      return data;
    },
    getQueueNext: (shopSlug) => c.get(`/shops/${shopSlug}/queue/next`),
    getMetrics: (shopSlug) => c.get(`/shops/${shopSlug}/metrics`, API_TIMEOUT_WAIT_TIMES_MS),
    getWaitDebug: (shopSlug) => c.get(`/shops/${shopSlug}/wait-debug`, API_TIMEOUT_WAIT_TIMES_MS),
    getWaitTimes: (shopSlug) => c.get(`/shops/${shopSlug}/wait-times`, API_TIMEOUT_WAIT_TIMES_MS),
    getStatistics: (shopSlug, since) => {
      const params = since ? `?since=${since.toISOString()}` : '';
      return c.get(`/shops/${shopSlug}/statistics${params}`);
    },
    recalculate: (shopSlug) => c.post(`/shops/${shopSlug}/recalculate`, {}),
  };
}
