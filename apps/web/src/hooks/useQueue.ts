import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { POLL_INTERVALS } from '@/lib/constants';
import type { GetQueueResponse } from '@eutonafila/shared';
import { wsClient } from '@/lib/ws';

const MIN_POLL_MS = POLL_INTERVALS.QUEUE_MIN_MS;

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
  const wsEventExpiryTimeoutRef = useRef<number | null>(null);
  const scope: QueueScope = options.scope ?? 'full';

  const effectiveInterval =
    pollInterval != null && pollInterval > 0
      ? Math.max(pollInterval, MIN_POLL_MS)
      : undefined;
  const wsUpdateIsRecent =
    Date.now() - lastWsQueueEventAt < POLL_INTERVALS.QUEUE_WS_RECENT_WINDOW_MS;
  const wsBackoffInterval = Math.max(effectiveInterval ?? POLL_INTERVALS.QUEUE, 20000);
  const wsHeartbeatInterval = Math.max(
    effectiveInterval ?? POLL_INTERVALS.QUEUE,
    POLL_INTERVALS.QUEUE_WS_HEARTBEAT_MS
  );
  const activePollInterval =
    scope !== 'status' && isWsConnected
      ? wsUpdateIsRecent
        ? wsBackoffInterval
        : wsHeartbeatInterval
      : effectiveInterval;

  const fetchQueue = useCallback(async () => {
    // Skip if page is hidden (Page Visibility API)
    if (document.hidden) {
      return;
    }

    try {
      setError(null);
      let queueData = await api.getQueue(shopSlug, { scope });
      if (scope === 'public' && (!queueData || !Array.isArray(queueData.tickets))) {
        queueData = await api.getQueue(shopSlug, { scope: 'full' });
      }

      // Smart diffing: only update if data actually changed
      const dataString = JSON.stringify(queueData);
      if (dataString !== previousDataRef.current) {
        previousDataRef.current = dataString;
        setData(queueData);
        setIsLoading(false);
      }
    } catch (err) {
      if (scope === 'public') {
        try {
          const fallbackData = await api.getQueue(shopSlug, { scope: 'full' });
          const dataString = JSON.stringify(fallbackData);
          if (dataString !== previousDataRef.current) {
            previousDataRef.current = dataString;
            setData(fallbackData);
          }
          setError(null);
          setIsLoading(false);
          return;
        } catch {
          // Ignore fallback failure and report original error below.
        }
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch queue'));
      setIsLoading(false);
    }
  }, [shopSlug, scope]);

  useEffect(() => {
    fetchQueue();

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
        if (!intervalId) {
          fetchQueue();
          intervalId = window.setInterval(fetchQueue, activePollInterval);
        }
      }
    };

    intervalId = window.setInterval(fetchQueue, activePollInterval);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchQueue, activePollInterval]);

  useEffect(() => {
    if (scope === 'status') return;

    const unsubscribeQueue = wsClient.subscribeQueue(shopSlug, () => {
      const now = Date.now();
      setLastWsQueueEventAt(now);
      if (wsEventExpiryTimeoutRef.current) {
        clearTimeout(wsEventExpiryTimeoutRef.current);
      }
      wsEventExpiryTimeoutRef.current = window.setTimeout(() => {
        setLastWsQueueEventAt(0);
      }, POLL_INTERVALS.QUEUE_WS_RECENT_WINDOW_MS);
      if (now - lastWsRefetchAtRef.current < 1000) return;
      lastWsRefetchAtRef.current = now;
      void fetchQueue();
    });
    const unsubscribeConn = wsClient.onConnectionStateChange((connected) => {
      setIsWsConnected(connected);
    });

    return () => {
      unsubscribeQueue();
      unsubscribeConn();
      if (wsEventExpiryTimeoutRef.current) {
        clearTimeout(wsEventExpiryTimeoutRef.current);
        wsEventExpiryTimeoutRef.current = null;
      }
      setIsWsConnected(false);
      setLastWsQueueEventAt(0);
    };
  }, [shopSlug, scope, fetchQueue]);

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
    refetch: fetchQueue,
  };
}
