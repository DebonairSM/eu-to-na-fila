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
 * Detect network connection speed
 */
function getNetworkMultiplier(): number {
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      // Slow 2G: 2x interval, 2G: 1.5x, 3G: 1.2x, 4G: 1x
      const effectiveType = conn.effectiveType;
      if (effectiveType === 'slow-2g') return 2.0;
      if (effectiveType === '2g') return 1.5;
      if (effectiveType === '3g') return 1.2;
    }
  }
  return 1.0;
}

/**
 * Hook for polling queue data from the API.
 * Fetches queue state every 3 seconds by default.
 * Optimized for mobile with Page Visibility API, exponential backoff, and network awareness.
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
  const isMountedRef = useRef(true);
  const errorCountRef = useRef(0);
  const backoffTimeoutRef = useRef<number | null>(null);

  const fetchQueue = useCallback(async () => {
    // Skip if page is hidden (Page Visibility API)
    if (document.hidden) {
      return;
    }

    try {
      const startTime = performance.now();
      const queueData = await api.getQueue(shopId);
      const fetchTime = performance.now() - startTime;
      
      if (isMountedRef.current) {
        setData(queueData);
        setError(null);
        setIsLoading(false);
        // Reset error count on success
        errorCountRef.current = 0;
      }

      // Network-aware: if fetch took too long, we might be on slow connection
      if (fetchTime > 2000 && 'connection' in navigator) {
        // Connection might be slow, but don't adjust immediately
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
        errorCountRef.current += 1;
      }
      logError('Error fetching queue', err);
    }
  }, [shopId]);

  const scheduleNextPoll = useCallback(() => {
    if (!isMountedRef.current || !enabled || document.hidden) {
      return;
    }

    // Clear any existing timeout
    if (backoffTimeoutRef.current) {
      clearTimeout(backoffTimeoutRef.current);
      backoffTimeoutRef.current = null;
    }

    // Calculate effective interval with network awareness and exponential backoff
    const networkMultiplier = getNetworkMultiplier();
    const backoffMultiplier = Math.min(1 + errorCountRef.current * 0.5, 5); // Max 5x backoff
    const effectiveInterval = interval * networkMultiplier * backoffMultiplier;

    // Use requestIdleCallback if available for non-critical polling
    if (window.requestIdleCallback && errorCountRef.current === 0) {
      backoffTimeoutRef.current = window.requestIdleCallback(
        () => {
          fetchQueue();
          scheduleNextPoll();
        },
        { timeout: effectiveInterval }
      ) as unknown as number;
    } else {
      backoffTimeoutRef.current = window.setTimeout(() => {
        fetchQueue();
        scheduleNextPoll();
      }, effectiveInterval);
    }
  }, [fetchQueue, interval, enabled]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      return;
    }

    // Fetch immediately on mount
    fetchQueue();

    // Start polling schedule
    scheduleNextPoll();

    // Handle Page Visibility API - pause when hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, clear any pending polls
        if (backoffTimeoutRef.current) {
          if (window.cancelIdleCallback) {
            window.cancelIdleCallback(backoffTimeoutRef.current as unknown as number);
          } else {
            clearTimeout(backoffTimeoutRef.current);
          }
          backoffTimeoutRef.current = null;
        }
      } else {
        // Page is visible, resume polling
        fetchQueue();
        scheduleNextPoll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      if (backoffTimeoutRef.current) {
        if (window.cancelIdleCallback) {
          window.cancelIdleCallback(backoffTimeoutRef.current as unknown as number);
        } else {
          clearTimeout(backoffTimeoutRef.current);
        }
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchQueue, scheduleNextPoll, enabled]);

  return { data, isLoading, error, refetch: fetchQueue };
}

/**
 * Hook for polling a specific ticket's status.
 * Optimized for mobile with Page Visibility API, exponential backoff, and network awareness.
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
  const isMountedRef = useRef(true);
  const errorCountRef = useRef(0);
  const backoffTimeoutRef = useRef<number | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) {
      return;
    }

    // Skip if page is hidden (Page Visibility API)
    if (document.hidden) {
      return;
    }

    try {
      const startTime = performance.now();
      const ticketData = await api.getTicket(ticketId);
      const fetchTime = performance.now() - startTime;
      
      if (isMountedRef.current) {
        setTicket(ticketData);
        setError(null);
        setIsLoading(false);
        // Reset error count on success
        errorCountRef.current = 0;
      }

      // Network-aware: if fetch took too long, we might be on slow connection
      if (fetchTime > 2000 && 'connection' in navigator) {
        // Connection might be slow, but don't adjust immediately
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
        errorCountRef.current += 1;
      }
      logError('Error fetching ticket', err);
    }
  }, [ticketId]);

  const scheduleNextPoll = useCallback(() => {
    if (!isMountedRef.current || !enabled || !ticketId || document.hidden) {
      return;
    }

    // Clear any existing timeout
    if (backoffTimeoutRef.current) {
      clearTimeout(backoffTimeoutRef.current);
      backoffTimeoutRef.current = null;
    }

    // Calculate effective interval with network awareness and exponential backoff
    const networkMultiplier = getNetworkMultiplier();
    const backoffMultiplier = Math.min(1 + errorCountRef.current * 0.5, 5); // Max 5x backoff
    const effectiveInterval = interval * networkMultiplier * backoffMultiplier;

    // Use requestIdleCallback if available for non-critical polling
    if (window.requestIdleCallback && errorCountRef.current === 0) {
      backoffTimeoutRef.current = window.requestIdleCallback(
        () => {
          fetchTicket();
          scheduleNextPoll();
        },
        { timeout: effectiveInterval }
      ) as unknown as number;
    } else {
      backoffTimeoutRef.current = window.setTimeout(() => {
        fetchTicket();
        scheduleNextPoll();
      }, effectiveInterval);
    }
  }, [fetchTicket, interval, enabled, ticketId]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !ticketId) {
      setIsLoading(false);
      return;
    }

    // Fetch immediately on mount
    fetchTicket();

    // Start polling schedule
    scheduleNextPoll();

    // Handle Page Visibility API - pause when hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, clear any pending polls
        if (backoffTimeoutRef.current) {
          if (window.cancelIdleCallback) {
            window.cancelIdleCallback(backoffTimeoutRef.current as unknown as number);
          } else {
            clearTimeout(backoffTimeoutRef.current);
          }
          backoffTimeoutRef.current = null;
        }
      } else {
        // Page is visible, resume polling
        fetchTicket();
        scheduleNextPoll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      if (backoffTimeoutRef.current) {
        if (window.cancelIdleCallback) {
          window.cancelIdleCallback(backoffTimeoutRef.current as unknown as number);
        } else {
          clearTimeout(backoffTimeoutRef.current);
        }
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchTicket, scheduleNextPoll, enabled, ticketId]);

  return { ticket, isLoading, error, refetch: fetchTicket };
}

