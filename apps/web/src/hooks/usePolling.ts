import { useEffect, useState, useRef, useCallback } from 'react';
import type { Ticket } from '@eutonafila/shared';
import { config } from '../lib/config';
import { logError } from '../lib/logger';
import { api } from '../lib/api';

interface QueueData {
  shop: {
    id: number;
    slug: string;
    name: string;
  };
  tickets: Ticket[];
}

interface UsePollingOptions {
  interval?: number; // Polling interval in milliseconds
  enabled?: boolean; // Whether polling is enabled
}

/**
 * Hook for polling queue data from the API.
 * Fetches queue state every 3 seconds by default.
 * 
 * @param shopId - Shop slug identifier
 * @param options - Polling options
 * @returns Queue data, loading state, and error state
 */
export function useQueuePolling(
  shopId: string = config.slug,
  options: UsePollingOptions = {}
) {
  const { interval = 3000, enabled = true } = options;
  const [data, setData] = useState<QueueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const fetchQueue = useCallback(async () => {
    try {
      const queueData = await api.getQueue(shopId);
      
      if (isMountedRef.current) {
        setData(queueData);
        setError(null);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
      }
      logError('Error fetching queue', err);
    }
  }, [shopId]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      return;
    }

    // Fetch immediately on mount
    fetchQueue();

    // Set up polling interval
    intervalRef.current = window.setInterval(() => {
      fetchQueue();
    }, interval);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchQueue, interval, enabled]);

  return { data, isLoading, error, refetch: fetchQueue };
}

/**
 * Hook for polling a specific ticket's status.
 * 
 * @param ticketId - Ticket ID
 * @param options - Polling options
 * @returns Ticket data, loading state, and error state
 */
export function useTicketPolling(
  ticketId: number | null,
  options: UsePollingOptions = {}
) {
  const { interval = 3000, enabled = true } = options;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) {
      return;
    }

    try {
      const ticketData = await api.getTicket(ticketId);
      
      if (isMountedRef.current) {
        setTicket(ticketData);
        setError(null);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
      }
      logError('Error fetching ticket', err);
    }
  }, [ticketId]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !ticketId) {
      setIsLoading(false);
      return;
    }

    // Fetch immediately on mount
    fetchTicket();

    // Set up polling interval
    intervalRef.current = window.setInterval(() => {
      fetchTicket();
    }, interval);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTicket, interval, enabled, ticketId]);

  return { ticket, isLoading, error, refetch: fetchTicket };
}

