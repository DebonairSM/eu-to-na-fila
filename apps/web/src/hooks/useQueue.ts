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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQueue.ts:15',message:'Queue data fetched',data:{waitingTicketsCount:queueData.tickets.filter(t=>t.status==='waiting').length,waitingTickets:queueData.tickets.filter(t=>t.status==='waiting').map(t=>({id:t.id,position:t.position,waitTime:t.estimatedWaitTime}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      // Smart diffing: only update if data actually changed
      const dataString = JSON.stringify(queueData);
      if (dataString !== previousDataRef.current) {
        previousDataRef.current = dataString;
        setData(queueData);
        setIsLoading(false);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQueue.ts:23',message:'Queue data updated in state',data:{waitingTicketsCount:queueData.tickets.filter(t=>t.status==='waiting').length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
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
