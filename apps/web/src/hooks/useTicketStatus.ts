import { useState, useEffect, useRef } from 'react';
import type { Ticket } from '@eutonafila/shared';
import { useTicketPolling } from './usePolling';
import { POLL_INTERVALS } from '@/lib/constants';

export function useTicketStatus(ticketId: number | null) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const previousDataRef = useRef<{ status: string; estimatedWaitTime: number | undefined; position: number } | null>(null);

  // When in line (waiting) or unknown: poll every 15s; otherwise every minute
  const interval =
    ticket == null || ticket.status === 'waiting'
      ? POLL_INTERVALS.TICKET_STATUS_CHECK_IN_LINE
      : POLL_INTERVALS.TICKET_STATUS;

  const { ticket: polledTicket, isLoading, error, refetch } = useTicketPolling(ticketId, {
    interval,
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
