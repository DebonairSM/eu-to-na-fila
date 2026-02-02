import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import type { Barber } from '@eutonafila/shared';

export function useBarbers(pollInterval?: number) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const previousDataRef = useRef<string>('');

  const fetchBarbers = useCallback(async () => {
    if (document.hidden) {
      return;
    }

    try {
      setError(null);
      const barbersList = await api.getBarbers(config.slug);

      if (pollInterval && pollInterval > 0) {
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
  }, [pollInterval]);

  useEffect(() => {
    setIsLoading(true);
    fetchBarbers();

    if (!pollInterval || pollInterval <= 0) {
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
          intervalId = window.setInterval(fetchBarbers, pollInterval);
        }
      }
    };

    intervalId = window.setInterval(fetchBarbers, pollInterval);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchBarbers, pollInterval]);

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
