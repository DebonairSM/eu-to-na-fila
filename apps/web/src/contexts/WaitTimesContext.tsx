import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { api } from '@/lib/api';
import { logError } from '@/lib/logger';
import { API_TIMEOUT_WAIT_TIMES_MS } from '@/lib/constants';

export type WaitTimesData = {
  standardWaitTime: number | null;
  barberWaitTimes: Array<{
    barberId: number;
    barberName: string;
    waitTime: number | null;
    isPresent: boolean;
  }>;
};

const EMPTY: WaitTimesData = {
  standardWaitTime: null,
  barberWaitTimes: [],
};

type WaitTimesContextValue = {
  waitTimes: WaitTimesData | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

const WaitTimesContext = createContext<WaitTimesContextValue | null>(null);

const POLL_INTERVAL_MS = 20000;

/**
 * Single source for wait-times on the join route. Fetches as soon as the provider
 * mounts (when user hits /join), so the request is in flight before the guard or form render.
 */
export function WaitTimesProvider({ children }: { children: React.ReactNode }) {
  const shopSlug = useShopSlug();
  const [waitTimes, setWaitTimes] = useState<WaitTimesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  const fetchWaitTimes = useCallback(async () => {
    if (!shopSlug) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Wait times request timed out')), API_TIMEOUT_WAIT_TIMES_MS)
      );
      const data = await Promise.race([api.getWaitTimes(shopSlug), timeoutPromise]);
      setWaitTimes(data);
    } catch (err) {
      logError('Wait times fetch failed', err);
      setWaitTimes(EMPTY);
    } finally {
      setIsLoading(false);
    }
  }, [shopSlug]);

  useEffect(() => {
    fetchWaitTimes();

    const schedulePoll = () => {
      if (intervalRef.current) return;
      intervalRef.current = window.setInterval(() => {
        if (!document.hidden) fetchWaitTimes();
      }, POLL_INTERVAL_MS);
    };

    const stopPoll = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    schedulePoll();
    const onVisibility = () => (document.hidden ? stopPoll() : schedulePoll());
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopPoll();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchWaitTimes]);

  const value: WaitTimesContextValue = {
    waitTimes,
    isLoading,
    refetch: fetchWaitTimes,
  };

  return (
    <WaitTimesContext.Provider value={value}>
      {children}
    </WaitTimesContext.Provider>
  );
}

export function useWaitTimes(): WaitTimesContextValue {
  const ctx = useContext(WaitTimesContext);
  if (!ctx) {
    return {
      waitTimes: null,
      isLoading: true,
      refetch: async () => {},
    };
  }
  return ctx;
}
