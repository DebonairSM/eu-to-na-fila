import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { getOrCreateDeviceId } from '@/lib/utils';
import type { Ticket } from '@eutonafila/shared';

/**
 * Fetches the active ticket (waiting or in_progress) for the current device.
 * Used to conditionally show "Ver status" on join/schedule pages.
 */
export function useActiveTicket(): { activeTicket: Ticket | null; isLoading: boolean } {
  const shopSlug = useShopSlug();
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const deviceId = getOrCreateDeviceId();
        const ticket = await api.getActiveTicketByDevice(shopSlug, deviceId);
        if (mounted && ticket && (ticket.status === 'waiting' || ticket.status === 'in_progress')) {
          setActiveTicket(ticket);
        } else if (mounted) {
          setActiveTicket(null);
        }
      } catch {
        if (mounted) setActiveTicket(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    check();
    return () => { mounted = false; };
  }, [shopSlug]);

  return { activeTicket, isLoading };
}
