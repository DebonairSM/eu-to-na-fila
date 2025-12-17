import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { Ticket } from '@eutonafila/shared';
import { useTicketPolling } from './usePolling';

const POLL_INTERVAL = 3000; // 3 seconds per US-002

export function useTicketStatus(ticketId: number | null) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const previousDataRef = useRef<{ status: string; estimatedWaitTime: number | undefined; position: number } | null>(null);

  // Use optimized polling hook
  const { ticket: polledTicket, isLoading, error, refetch } = useTicketPolling(ticketId, {
    interval: POLL_INTERVAL,
    enabled: !!ticketId,
  });

  // Apply smart diffing to prevent unnecessary updates
  useEffect(() => {
    if (!polledTicket) {
      setTicket(null);
      return;
    }

    const normalizedWait = polledTicket.estimatedWaitTime ?? undefined;
    const prev = previousDataRef.current;
    const hasChanged =
      !prev ||
      polledTicket.status !== prev.status ||
      normalizedWait !== prev.estimatedWaitTime ||
      polledTicket.position !== prev.position;

    if (hasChanged) {
      previousDataRef.current = {
        status: polledTicket.status,
        estimatedWaitTime: normalizedWait,
        position: polledTicket.position,
      };
      setTicket({ ...polledTicket, estimatedWaitTime: normalizedWait });
    }
  }, [polledTicket]);

  return {
    ticket,
    isLoading,
    error,
    refetch,
  };
}
