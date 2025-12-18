import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import type { Barber } from '@eutonafila/shared';

export function useBarbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBarbers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const barbersList = await api.getBarbers(config.slug);
      setBarbers(barbersList);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch barbers'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

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
