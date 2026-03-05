import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Container } from '@/components/design-system';
import { STORAGE_KEYS } from '@/lib/constants';
import { setPrefetch } from '@/lib/waitTimesPrefetch';
import { getOrCreateDeviceId, redirectToStatusPage } from '@/lib/utils';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useLocale } from '@/contexts/LocaleContext';
import { JoinPage } from './index';

const STORAGE_KEY = STORAGE_KEYS.ACTIVE_TICKET_ID;

/**
 * Route guard for JoinPage that blocks rendering until active ticket check completes.
 *
 * This component ensures users with active tickets are immediately redirected to their
 * status page before any form UI can render. It performs device-based checks first
 * (most reliable), then falls back to localStorage checks.
 */
export function JoinPageGuard() {
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRenderJoinPage, setShouldRenderJoinPage] = useState(false);
  const navigate = useNavigate();
  const shopSlug = useShopSlug();
  const { t } = useLocale();
  const hasRunForSlugRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const didShowForNoSlugRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    // No slug yet (e.g. initial load): show join page once so we don't block forever (and avoid setState loop)
    if (!shopSlug) {
      if (!didShowForNoSlugRef.current && mountedRef.current) {
        didShowForNoSlugRef.current = true;
        setShouldRenderJoinPage(true);
        setIsChecking(false);
      }
      return () => { mountedRef.current = false; };
    }
    if (hasRunForSlugRef.current === shopSlug) return () => { mountedRef.current = false; };
    hasRunForSlugRef.current = shopSlug;

    // Start wait-times request in parallel so the form can reuse it when it mounts
    setPrefetch(shopSlug, api.getWaitTimes(shopSlug));

    const checkActiveTicket = async () => {
      // Step 1: Check by deviceId FIRST (most reliable server-side check)
      // This is the primary method and should always be tried first
      try {
        const deviceId = getOrCreateDeviceId();
        const activeTicket = await api.getActiveTicketByDevice(shopSlug, deviceId);
        
        if (activeTicket && (activeTicket.status === 'waiting' || activeTicket.status === 'in_progress')) {
          if (!mountedRef.current) return;
          console.log('[JoinPageGuard] Found active ticket by deviceId, redirecting to status:', activeTicket.id);
          localStorage.setItem(STORAGE_KEY, activeTicket.id.toString());
          redirectToStatusPage(activeTicket.id, activeTicket.shopSlug, navigate, shopSlug);
          return;
        }
      } catch (error) {
        // Fall through to localStorage check. Single request only to avoid stacked delays.
        console.warn('[JoinPageGuard] Error checking active ticket by deviceId, falling back to localStorage check:', error);
      }

      // Step 2: Fallback to localStorage check (if deviceId check didn't find anything)
      const storedTicketId = localStorage.getItem(STORAGE_KEY);
      if (storedTicketId) {
        const ticketId = parseInt(storedTicketId, 10);
        if (!isNaN(ticketId)) {
          try {
            const ticket = await api.getTicket(ticketId);
            if (ticket && (ticket.status === 'waiting' || ticket.status === 'in_progress')) {
              if (!mountedRef.current) return;
              console.log('[JoinPageGuard] Found active ticket in localStorage, redirecting to status:', ticketId);
              redirectToStatusPage(ticketId, ticket.shopSlug, navigate, shopSlug);
              return;
            } else {
              // Ticket exists but is not active - clear it
              console.log('[JoinPageGuard] Stored ticket is no longer active, clearing:', ticketId);
              localStorage.removeItem(STORAGE_KEY);
            }
          } catch (error) {
            // Error verifying ticket - clear invalid storage
            console.warn('[JoinPageGuard] Error verifying stored ticket, clearing:', error);
            localStorage.removeItem(STORAGE_KEY);
          }
        } else {
          // Invalid ticketId in storage - clear it
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // No active ticket found - safe to render JoinPage (only if still mounted)
      if (mountedRef.current) {
        setShouldRenderJoinPage(true);
        setIsChecking(false);
      }
    };

    // Fail open: if the check doesn't complete in 8s (e.g. API hang), show join page
    const timeoutId = window.setTimeout(() => {
      if (mountedRef.current) {
        setShouldRenderJoinPage(true);
        setIsChecking(false);
      }
    }, 8000);

    checkActiveTicket();
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timeoutId);
    };
  }, [navigate, shopSlug]);

  // Block rendering until check completes
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[var(--shop-background)]">
        <Navigation />
        <Container className="pt-20 sm:pt-[100px] pb-12">
          <LoadingSpinner text={t('join.checkingStatus')} />
        </Container>
      </div>
    );
  }

  // Only render JoinPage if no active ticket was found
  if (shouldRenderJoinPage) {
    return <JoinPage />;
  }

  // This shouldn't be reached, but return null as fallback
  return null;
}
