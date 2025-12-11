import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import type { Service } from '@eutonafila/shared';

/**
 * Hook for fetching and managing services.
 * 
 * This hook fetches all services for the current shop and provides
 * helper methods for filtering active services.
 * 
 * @example
 * ```tsx
 * const { services, activeServices, isLoading, error, refetch } = useServices();
 * 
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorDisplay error={error} />;
 * 
 * return (
 *   <select>
 *     {activeServices.map(service => (
 *       <option key={service.id} value={service.id}>
 *         {service.name} - {service.duration}min
 *       </option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const servicesList = await api.getServices(config.slug);
      setServices(servicesList);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch services'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Filter active services
  const activeServices = services.filter((s) => s.isActive);

  // Get service by ID
  const getServiceById = useCallback(
    (id: number): Service | undefined => {
      return services.find((s) => s.id === id);
    },
    [services]
  );

  return {
    services,
    activeServices,
    isLoading,
    error,
    refetch: fetchServices,
    getServiceById,
  };
}










