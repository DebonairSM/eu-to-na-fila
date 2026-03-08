import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { getCachedBarbers, setCachedBarbers } from '@/lib/cache/barbersCache';
import { POLL_INTERVALS } from '@/lib/constants';
import type { Barber } from '@eutonafila/shared';

const MIN_BARBER_POLL_MS = POLL_INTERVALS.QUEUE_MIN_MS;

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

  const fetchBarbers = useCallback(async () => {
    if (document.hidden) {
      return;
    }

    try {
      setError(null);
      const barbersList = await api.getBarbers(shopSlug);
      setCachedBarbers(shopSlug, barbersList);

      if (effectivePollInterval != null && effectivePollInterval > 0) {
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
  }, [effectivePollInterval, shopSlug]);

  useEffect(() => {
    const cachedNow = getCachedBarbers(shopSlug);
    if (cachedNow !== undefined) {
      setBarbers(cachedNow);
      setIsLoading(false);
      setError(null);
    } else {
      setIsLoading(true);
    }
    fetchBarbers();

    if (!effectivePollInterval || effectivePollInterval <= 0) {
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
        if (!intervalId) {
          fetchBarbers();
          intervalId = window.setInterval(fetchBarbers, effectivePollInterval);
        }
      }
    };

    intervalId = window.setInterval(fetchBarbers, effectivePollInterval);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchBarbers, effectivePollInterval]);

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
        await fetchBarbers();
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
    refetch: fetchBarbers,
    togglePresence,
  };
}
