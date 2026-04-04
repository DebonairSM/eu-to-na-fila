import { useState, useEffect, useRef } from 'react';
import type { Ticket } from '@eutonafila/shared';
import { useTicketPolling } from './usePolling';
import { POLL_INTERVALS } from '@/lib/constants';

export function useTicketStatus(ticketId: number | null) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const previousDataRef = useRef<{ status: string; estimatedWaitTime: number | undefined; position: number; rating: number | undefined } | null>(null);

  // When in line (waiting) or unknown: poll every 15s; otherwise every minute
  const interval =
    ticket == null || ticket.status === 'waiting'
      ? POLL_INTERVALS.TICKET_STATUS_CHECK_IN_LINE
      : POLL_INTERVALS.TICKET_STATUS;

  const { ticket: polledTicket, isLoading, error, refetch } = useTicketPolling(ticketId, {
    interval,
    enabled: !!ticketId,
  });

  // Apply smart diffing to prevent unnecessary updates (include rating so "Thanks" shows after submit)
  useEffect(() => {
    if (!polledTicket) {
      // #region agent log
      fetch('http://127.0.0.1:7715/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'join-add-run',hypothesisId:'H3',location:'useTicketStatus.ts:polledTicket:null',message:'ticket polling returned null',data:{ticketId:ticketId??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setTicket(null);
      return;
    }

    const normalizedWait = polledTicket.estimatedWaitTime ?? undefined;
    const polledRating = (polledTicket as { rating?: number }).rating;
    const prev = previousDataRef.current;
    const hasChanged =
      !prev ||
      polledTicket.status !== prev.status ||
      normalizedWait !== prev.estimatedWaitTime ||
      polledTicket.position !== prev.position ||
      polledRating !== prev.rating;

    if (hasChanged) {
      // #region agent log
      fetch('http://127.0.0.1:7715/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'join-add-run',hypothesisId:'H3',location:'useTicketStatus.ts:polledTicket:changed',message:'ticket polling data changed and state updated',data:{ticketId:polledTicket.id,status:polledTicket.status,position:polledTicket.position,estimatedWaitTime:normalizedWait??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      previousDataRef.current = {
        status: polledTicket.status,
        estimatedWaitTime: normalizedWait,
        position: polledTicket.position,
        rating: polledRating,
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
