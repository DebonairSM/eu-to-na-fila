import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import type { GetQueueResponse } from '@eutonafila/shared';

export function useQueue(pollInterval?: number) {
  const [data, setData] = useState<GetQueueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const previousDataRef = useRef<string>('');

  const fetchQueue = useCallback(async () => {
    try {
      setError(null);
      const queueData = await api.getQueue(config.slug);

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
  }, []);

  useEffect(() => {
    fetchQueue();

    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(fetchQueue, pollInterval);
      return () => clearInterval(interval);
    }
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
