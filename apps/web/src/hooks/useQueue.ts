import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import type { GetQueueResponse } from '@eutonafila/shared';

export function useQueue(pollInterval?: number) {
  const shopSlug = useShopSlug();
  const [data, setData] = useState<GetQueueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const previousDataRef = useRef<string>('');

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

    if (!pollInterval || pollInterval <= 0) {
      return;
    }

    let intervalId: number | null = null;

    // Handle Page Visibility API - pause when hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, clear interval
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } else {
        // Page is visible, resume polling
        if (!intervalId) {
          fetchQueue();
          intervalId = window.setInterval(fetchQueue, pollInterval);
        }
      }
    };

    // Start polling
    intervalId = window.setInterval(fetchQueue, pollInterval);

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchQueue, pollInterval]);

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
