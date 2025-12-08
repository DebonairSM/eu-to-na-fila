import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { Ticket } from '@eutonafila/shared';

const POLL_INTERVAL = 3000; // 3 seconds per US-002

export function useTicketStatus(ticketId: number | null) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const previousDataRef = useRef<{ status: string; estimatedWaitTime: number | undefined; position: number } | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const ticketData = await api.getTicket(ticketId);
      const normalizedWait = ticketData.estimatedWaitTime ?? undefined;

      const prev = previousDataRef.current;
      const hasChanged =
        !prev ||
        ticketData.status !== prev.status ||
        normalizedWait !== prev.estimatedWaitTime ||
        ticketData.position !== prev.position;

      if (hasChanged) {
        previousDataRef.current = {
          status: ticketData.status,
          estimatedWaitTime: normalizedWait,
          position: ticketData.position,
        };
        setTicket({ ...ticketData, estimatedWaitTime: normalizedWait });
      }
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch ticket'));
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();

    if (ticketId) {
      const interval = setInterval(fetchTicket, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [fetchTicket, ticketId]);

  return {
    ticket,
    isLoading,
    error,
    refetch: fetchTicket,
  };
}
