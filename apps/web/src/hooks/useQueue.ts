import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { POLL_INTERVALS } from '@/lib/constants';
import type { GetQueueResponse } from '@eutonafila/shared';
import { wsClient } from '@/lib/ws';

const MIN_POLL_MS = POLL_INTERVALS.QUEUE_MIN_MS;

/** Skip timer-driven fetches if another queue request finished recently (coalesces with WS-triggered refetches). */
const MIN_QUEUE_HTTP_COALESCE_MS = 2200;

/** Batch rapid WebSocket queue notifications into one refetch. */
const QUEUE_WS_DEBOUNCE_MS = 450;

/** After a WS-driven refetch, ignore further WS triggers briefly (debounce handles bursts). */
const QUEUE_WS_MIN_REFETCH_GAP_MS = 1800;

type QueueScope = 'full' | 'public' | 'status';

interface UseQueueOptions {
  scope?: QueueScope;
}

export function useQueue(pollInterval?: number, options: UseQueueOptions = {}) {
  const shopSlug = useShopSlug();
  const [data, setData] = useState<GetQueueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [lastWsQueueEventAt, setLastWsQueueEventAt] = useState(0);
  const previousDataRef = useRef<string>('');
  const lastWsRefetchAtRef = useRef(0);
  const lastQueueHttpAtRef = useRef(0);
  const wsEventExpiryTimeoutRef = useRef<number | null>(null);
  const wsDebounceTimerRef = useRef<number | null>(null);
  /** Pause polling after 429 / 431 to avoid amplifying rate or header limits. */
  const pollBackoffUntilRef = useRef(0);
  const scope: QueueScope = options.scope ?? 'full';

  const effectiveInterval =
    pollInterval != null && pollInterval > 0
      ? Math.max(pollInterval, MIN_POLL_MS)
      : undefined;
  const wsUpdateIsRecent =
    Date.now() - lastWsQueueEventAt < POLL_INTERVALS.QUEUE_WS_RECENT_WINDOW_MS;
  const wsBackoffInterval = Math.max(
    effectiveInterval ?? POLL_INTERVALS.QUEUE,
    POLL_INTERVALS.QUEUE_WS_ACTIVE_POLL_MIN_MS
  );
  const wsHeartbeatInterval = Math.max(
    effectiveInterval ?? POLL_INTERVALS.QUEUE,
    POLL_INTERVALS.QUEUE_WS_HEARTBEAT_MS
  );
  const activePollInterval =
    isWsConnected
      ? wsUpdateIsRecent
        ? wsBackoffInterval
        : wsHeartbeatInterval
      : effectiveInterval;

  const fetchQueue = useCallback(
    async (force = false) => {
      // Allow forced fetches while hidden so the first load / WS refetch can complete; otherwise
      // a background-tab start leaves isLoading true forever because the visibility handler does
      // not refetch when the interval was never cleared (intervalId already set).
      if (document.hidden && !force) {
        return;
      }
      if (Date.now() < pollBackoffUntilRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7807/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'queue-fetch',hypothesisId:'H3',location:'useQueue.ts:fetchQueue',message:'skipped poll backoff',data:{shopSlug,force,until:pollBackoffUntilRef.current},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return;
      }

      const now = Date.now();
      if (
        !force &&
        lastQueueHttpAtRef.current > 0 &&
        now - lastQueueHttpAtRef.current < MIN_QUEUE_HTTP_COALESCE_MS
      ) {
        // #region agent log
        fetch('http://127.0.0.1:7807/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'queue-fetch',hypothesisId:'H4',location:'useQueue.ts:fetchQueue',message:'skipped http coalesce',data:{shopSlug,force,msSinceHttp:now-lastQueueHttpAtRef.current},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return;
      }

      try {
        setError(null);
        // #region agent log
        fetch('http://127.0.0.1:7807/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'queue-fetch',hypothesisId:'H1',location:'useQueue.ts:fetchQueue',message:'queue http start',data:{shopSlug,scope,force,hidden:document.hidden},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        let queueData = await api.getQueue(shopSlug, { scope });
        if (scope === 'public' && (!queueData || !Array.isArray(queueData.tickets))) {
          queueData = await api.getQueue(shopSlug, { scope: 'full' });
        }

        lastQueueHttpAtRef.current = Date.now();

        const dataString = JSON.stringify(queueData);
        if (dataString !== previousDataRef.current) {
          previousDataRef.current = dataString;
          setData(queueData);
        }
        setIsLoading(false);
        pollBackoffUntilRef.current = 0;
        // #region agent log
        fetch('http://127.0.0.1:7807/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'queue-fetch',hypothesisId:'H2',location:'useQueue.ts:fetchQueue',message:'queue http ok',data:{shopSlug,scope,ticketCount:Array.isArray(queueData.tickets)?queueData.tickets.length:-1},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      } catch (err) {
        if (scope === 'public') {
          try {
            const fallbackData = await api.getQueue(shopSlug, { scope: 'full' });
            lastQueueHttpAtRef.current = Date.now();
            const dataString = JSON.stringify(fallbackData);
            if (dataString !== previousDataRef.current) {
              previousDataRef.current = dataString;
              setData(fallbackData);
            }
            setError(null);
            setIsLoading(false);
            pollBackoffUntilRef.current = 0;
            return;
          } catch {
            // Ignore fallback failure and report original error below.
          }
        }
        if (err instanceof ApiError && (err.statusCode === 429 || err.statusCode === 431)) {
          const ms = err.statusCode === 431 ? 45000 : 20000;
          pollBackoffUntilRef.current = Date.now() + ms;
        }
        setError(err instanceof Error ? err : new Error('Failed to fetch queue'));
        setIsLoading(false);
      }
    },
    [shopSlug, scope]
  );

  useEffect(() => {
    void fetchQueue(true);

    if (!activePollInterval || activePollInterval <= 0) {
      return;
    }

    let intervalId: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } else {
        void fetchQueue(true);
        if (!intervalId) {
          intervalId = window.setInterval(() => void fetchQueue(false), activePollInterval);
        }
      }
    };

    intervalId = window.setInterval(() => void fetchQueue(false), activePollInterval);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchQueue, activePollInterval]);

  useEffect(() => {
    const runWsRefetch = () => {
      wsDebounceTimerRef.current = null;
      const t = Date.now();
      if (t - lastWsRefetchAtRef.current < QUEUE_WS_MIN_REFETCH_GAP_MS) {
        return;
      }
      lastWsRefetchAtRef.current = t;
      void fetchQueue(true);
    };

    const unsubscribeQueue = wsClient.subscribeQueue(shopSlug, () => {
      const now = Date.now();
      setLastWsQueueEventAt(now);
      if (wsEventExpiryTimeoutRef.current) {
        clearTimeout(wsEventExpiryTimeoutRef.current);
      }
      wsEventExpiryTimeoutRef.current = window.setTimeout(() => {
        setLastWsQueueEventAt(0);
      }, POLL_INTERVALS.QUEUE_WS_RECENT_WINDOW_MS);

      if (wsDebounceTimerRef.current !== null) {
        clearTimeout(wsDebounceTimerRef.current);
      }
      wsDebounceTimerRef.current = window.setTimeout(runWsRefetch, QUEUE_WS_DEBOUNCE_MS);
    });
    const unsubscribeConn = wsClient.onConnectionStateChange((connected) => {
      setIsWsConnected(connected);
    });

    return () => {
      unsubscribeQueue();
      unsubscribeConn();
      if (wsDebounceTimerRef.current !== null) {
        clearTimeout(wsDebounceTimerRef.current);
        wsDebounceTimerRef.current = null;
      }
      if (wsEventExpiryTimeoutRef.current) {
        clearTimeout(wsEventExpiryTimeoutRef.current);
        wsEventExpiryTimeoutRef.current = null;
      }
      setIsWsConnected(false);
      setLastWsQueueEventAt(0);
    };
  }, [shopSlug, scope, fetchQueue]);

  const refetchQueue = useCallback(() => fetchQueue(true), [fetchQueue]);

  const waitingTickets = data?.tickets.filter((t) => t.status === 'waiting') || [];
  const inProgressTickets = data?.tickets.filter((t) => t.status === 'in_progress') || [];
  const completedTickets = data?.tickets.filter((t) => t.status === 'completed') || [];

  return {
    data,
    shop: data?.shop,
    tickets: data?.tickets || [],
    waitingTickets,
    inProgressTickets,
    completedTickets,
    isLoading,
    error,
    refetch: refetchQueue,
  };
}
