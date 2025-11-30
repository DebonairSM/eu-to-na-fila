import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { Ticket } from '@eutonafila/shared';

const POLL_INTERVAL = 3000; // 3 seconds per US-002

export function useTicketStatus(ticketId: number | null) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const previousStatusRef = useRef<string>('');

  const fetchTicket = useCallback(async () => {
    if (!ticketId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const ticketData = await api.getTicket(ticketId);

      // Only update if status actually changed (smart diffing)
      if (ticketData.status !== previousStatusRef.current) {
        previousStatusRef.current = ticketData.status;
        setTicket(ticketData);
        setIsLoading(false);
      } else if (!ticket) {
        // Initial load
        setTicket(ticketData);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch ticket'));
      setIsLoading(false);
    }
  }, [ticketId, ticket]);

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
