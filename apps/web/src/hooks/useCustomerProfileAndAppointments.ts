import { useState, useCallback, useEffect } from 'react';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { api } from '@/lib/api';
import type { CustomerProfile, CustomerAppointmentsResponse } from '@/lib/api/auth';

export function useCustomerProfileAndAppointments() {
  const shopSlug = useShopSlug();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [appointments, setAppointments] = useState<CustomerAppointmentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!shopSlug) return;
    setIsLoading(true);
    setError(null);
    try {
      const [p, a] = await Promise.all([
        api.getCustomerProfile(shopSlug),
        api.getCustomerAppointments(shopSlug),
      ]);
      setProfile(p);
      setAppointments(a);
    } catch {
      setError('Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [shopSlug]);

  useEffect(() => {
    if (!shopSlug) {
      setIsLoading(false);
      setProfile(null);
      setAppointments(null);
      setError(null);
      return;
    }
    let mounted = true;
    setIsLoading(true);
    setError(null);
    Promise.all([
      api.getCustomerProfile(shopSlug),
      api.getCustomerAppointments(shopSlug),
    ])
      .then(([p, a]) => {
        if (mounted) {
          setProfile(p);
          setAppointments(a);
        }
      })
      .catch(() => {
        if (mounted) setError('Failed to load');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, [shopSlug]);

  return { profile, appointments, isLoading, error, refetch };
}
