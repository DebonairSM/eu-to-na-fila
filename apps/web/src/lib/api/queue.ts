import type { GetQueueResponse, GetMetricsResponse, GetStatisticsResponse, Ticket } from '@eutonafila/shared';
import type { BaseApiClient } from './client.js';
import { API_TIMEOUT_WAIT_TIMES_MS } from '../constants';
import { ApiError } from './errors.js';
import { getWebClientContextHeaderValue } from './clientContextHeader.js';

/**
 * Queue HTTP contract (with hooks/useQueue.ts + lib/ws.ts):
 * - Authoritative state comes from GET /shops/:slug/queue via getQueue(): fetch cache 'no-store', optional If-None-Match,
 *   and in-memory queueEtagCache + queueDataCache for 304 → reuse body without re-downloading JSON.
 * - After mutations that change the queue (e.g. join), call invalidateQueueHttpCache(shopSlug) so the client does not
 *   keep a stale body if the server ETag would still match incorrectly.
 * - WebSocket queue.updated is an invalidation signal only; UI refetches via HTTP (see wsClient.subscribeQueue in useQueue).
 * BaseApiClient GETs already use cache: 'no-store'; live queue paths are also excluded from the service worker API cache.
 */

export interface QueueNextResponse {
  next: Ticket | null;
  deadZoneWarning?: { message: string; appointmentTicketNumber?: string };
}

export interface GetQueueOptions {
  scope?: 'full' | 'public' | 'status';
}

const queueEtagCache = new Map<string, string>();
const queueDataCache = new Map<string, GetQueueResponse>();
const QUEUE_CACHE_KEY_PREFIX = 'queue:';

function buildQueueCacheKey(shopSlug: string, scope: GetQueueOptions['scope'] = 'full'): string {
  return `${QUEUE_CACHE_KEY_PREFIX}${shopSlug}:${scope}`;
}

export function invalidateQueueHttpCache(shopSlug?: string): void {
  if (!shopSlug) {
    queueEtagCache.clear();
    queueDataCache.clear();
    return;
  }

  const prefix = `${QUEUE_CACHE_KEY_PREFIX}${shopSlug}:`;
  for (const key of queueEtagCache.keys()) {
    if (key.startsWith(prefix)) queueEtagCache.delete(key);
  }
  for (const key of queueDataCache.keys()) {
    if (key.startsWith(prefix)) queueDataCache.delete(key);
  }
}

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
      const scopeValue = options?.scope ?? 'full';
      const scope = scopeValue !== 'full' ? `?scope=${scopeValue}` : '';
      const path = `/shops/${shopSlug}/queue${scope}`;
      const cacheKey = buildQueueCacheKey(shopSlug, scopeValue);
      const requestQueue = async (withEtag: boolean): Promise<Response> => {
        const headers: Record<string, string> = {};
        if (c.authToken) headers.Authorization = `Bearer ${c.authToken}`;
        headers['X-Client-Context'] = getWebClientContextHeaderValue();
        const existingEtag = withEtag ? queueEtagCache.get(cacheKey) : undefined;
        if (existingEtag) headers['If-None-Match'] = existingEtag;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        try {
          return await fetch(`${c.getBaseUrl()}${path}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
            signal: controller.signal,
            credentials: 'omit',
          });
        } catch (error) {
          throw new ApiError(
            error instanceof Error && error.name === 'AbortError'
              ? 'Request timed out - please check your connection'
              : 'Network error - please check your connection',
            error instanceof Error && error.name === 'AbortError' ? 408 : 0,
            error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR'
          );
        } finally {
          clearTimeout(timeoutId);
        }
      };

      let response = await requestQueue(true);

      if (response.status === 304) {
        const cached = queueDataCache.get(cacheKey);
        if (cached) return cached;
        // If ETag exists but body cache is missing, force a fresh request.
        response = await requestQueue(false);
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
