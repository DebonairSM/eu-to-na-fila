import type { GetQueueResponse, GetMetricsResponse, GetStatisticsResponse, Ticket } from '@eutonafila/shared';
import type { BaseApiClient } from './client.js';
import { API_TIMEOUT_WAIT_TIMES_MS } from '../constants';

export interface QueueNextResponse {
  next: Ticket | null;
  deadZoneWarning?: { message: string; appointmentTicketNumber?: string };
}

/** Queue + metrics domain methods. */
export interface QueueApi {
  getQueue(shopSlug: string): Promise<GetQueueResponse>;
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
    getQueue: (shopSlug) => c.get(`/shops/${shopSlug}/queue`),
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
