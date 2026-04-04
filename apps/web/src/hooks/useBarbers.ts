import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { getCachedBarbers, setCachedBarbers } from '@/lib/cache/barbersCache';
import { POLL_INTERVALS } from '@/lib/constants';
import type { Barber } from '@eutonafila/shared';

const MIN_BARBER_POLL_MS = POLL_INTERVALS.QUEUE_MIN_MS;

/** When polling, do not hit the network more often than this (uses in-memory barbers cache between calls). */
function minBarberHttpGapMs(pollIntervalMs: number): number {
  return Math.max(pollIntervalMs * 2, 28_000);
}

export function useBarbers(pollInterval?: number) {
  const shopSlug = useShopSlug();
  const cached = getCachedBarbers(shopSlug);
  const [barbers, setBarbers] = useState<Barber[]>(() => cached ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<Error | null>(null);
  const previousDataRef = useRef<string>('');

  const effectivePollInterval =
    pollInterval != null && pollInterval > 0
      ? Math.max(pollInterval, MIN_BARBER_POLL_MS)
      : undefined;

  const fetchBarbers = useCallback(
    async (force = false) => {
      if (document.hidden && !force) {
        return;
      }

      const polling = effectivePollInterval != null && effectivePollInterval > 0;
      const minGap = polling && !force ? minBarberHttpGapMs(effectivePollInterval) : 0;

      if (minGap > 0) {
        const cachedFresh = getCachedBarbers(shopSlug, minGap);
        if (cachedFresh !== undefined) {
          const dataString = JSON.stringify(cachedFresh);
          if (dataString !== previousDataRef.current) {
            previousDataRef.current = dataString;
            setBarbers(cachedFresh);
          }
          setIsLoading(false);
          return;
        }
      }

      try {
        setError(null);
        const barbersList = await api.getBarbers(shopSlug);
        setCachedBarbers(shopSlug, barbersList);

        if (polling) {
          const dataString = JSON.stringify(barbersList);
          if (dataString !== previousDataRef.current) {
            previousDataRef.current = dataString;
            setBarbers(barbersList);
          }
        } else {
          setBarbers(barbersList);
        }
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch barbers'));
        setIsLoading(false);
      }
    },
    [effectivePollInterval, shopSlug]
  );

  useEffect(() => {
    const cachedNow = getCachedBarbers(shopSlug);
    if (cachedNow !== undefined) {
      setBarbers(cachedNow);
      setIsLoading(false);
      setError(null);
    } else {
      setIsLoading(true);
    }
    const polling = effectivePollInterval != null && effectivePollInterval > 0;
    void fetchBarbers(true);

    if (!polling) {
      return;
    }

    let intervalId: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } else {
        void fetchBarbers(true);
        if (!intervalId) {
          intervalId = window.setInterval(() => void fetchBarbers(false), effectivePollInterval);
        }
      }
    };

    intervalId = window.setInterval(() => void fetchBarbers(false), effectivePollInterval);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchBarbers, effectivePollInterval]);

  const refetchBarbers = useCallback(() => fetchBarbers(true), [fetchBarbers]);

  const togglePresence = useCallback(
    async (barberId: number, isPresent: boolean) => {
      try {
        // Update optimistically
        setBarbers((prev) =>
          prev.map((b) =>
            b.id === barberId ? { ...b, isPresent } : b
          )
        );

        // Call API - backend handles unassigning customers automatically
        await api.toggleBarberPresence(barberId, isPresent);

        // Optimistic update already maintains order, no need to refetch
      } catch (err) {
        // Revert on error
        await fetchBarbers(true);
        throw err;
      }
    },
    [fetchBarbers]
  );

  const presentBarbers = barbers.filter((b) => b.isPresent);
  const absentBarbers = barbers.filter((b) => !b.isPresent);

  return {
    barbers,
    presentBarbers,
    absentBarbers,
    isLoading,
    error,
    refetch: refetchBarbers,
    togglePresence,
  };
}
