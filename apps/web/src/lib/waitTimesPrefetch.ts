/**
 * Prefetch cache for wait-times API. JoinPageGuard starts the request early;
 * useJoinForm consumes it to avoid a duplicate request and show wait times sooner.
 */

export type WaitTimesResult = {
  standardWaitTime: number | null;
  barberWaitTimes: Array<{
    barberId: number;
    barberName: string;
    waitTime: number | null;
    isPresent: boolean;
  }>;
};

const prefetchBySlug = new Map<string, Promise<WaitTimesResult>>();

export function setPrefetch(shopSlug: string, promise: Promise<WaitTimesResult>): void {
  prefetchBySlug.set(shopSlug, promise);
}

/**
 * Returns and removes the stored promise for this slug, if any.
 * Form should await it (with timeout); no second request is made when prefetch exists.
 */
export function takePrefetch(shopSlug: string): Promise<WaitTimesResult> | undefined {
  const promise = prefetchBySlug.get(shopSlug);
  if (promise !== undefined) {
    prefetchBySlug.delete(shopSlug);
    return promise;
  }
  return undefined;
}
