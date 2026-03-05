import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { POLL_INTERVALS } from '@/lib/constants';
import type { GetQueueResponse } from '@eutonafila/shared';

const MIN_POLL_MS = POLL_INTERVALS.QUEUE_MIN_MS;

export function useQueue(pollInterval?: number) {
  const shopSlug = useShopSlug();
  const [data, setData] = useState<GetQueueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const previousDataRef = useRef<string>('');

  const effectiveInterval =
    pollInterval != null && pollInterval > 0
      ? Math.max(pollInterval, MIN_POLL_MS)
      : undefined;

  const fetchQueue = useCallback(async () => {
    // Skip if page is hidden (Page Visibility API)
    if (document.hidden) {
      return;
    }

    try {
      setError(null);
      const queueData = await api.getQueue(shopSlug);

      // Smart diffing: only update if data actually changed
      const dataString = JSON.stringify(queueData);
      if (dataString !== previousDataRef.current) {
        previousDataRef.current = dataString;
        setData(queueData);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch queue'));
      setIsLoading(false);
    }
  }, [shopSlug]);

  useEffect(() => {
    fetchQueue();

    if (!effectiveInterval || effectiveInterval <= 0) {
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
          intervalId = window.setInterval(fetchQueue, effectiveInterval);
        }
      }
    };

    intervalId = window.setInterval(fetchQueue, effectiveInterval);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchQueue, effectiveInterval]);

  const ticketsList = Array.isArray(data?.tickets) ? data.tickets : [];
  const waitingTickets = ticketsList.filter((t) => t.status === 'waiting');
  const inProgressTickets = ticketsList.filter((t) => t.status === 'in_progress');
  const completedTickets = ticketsList.filter((t) => t.status === 'completed');

  return {
    data,
    shop: data?.shop,
    tickets: ticketsList,
    waitingTickets,
    inProgressTickets,
    completedTickets,
    isLoading,
    error,
    refetch: fetchQueue,
  };
}
