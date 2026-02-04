import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Container } from '@/components/design-system';
import { STORAGE_KEYS } from '@/lib/constants';
import { getOrCreateDeviceId } from '@/lib/utils';
import { config } from '@/lib/config';
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

  useEffect(() => {
    const checkActiveTicket = async () => {
      // Step 1: Check by deviceId FIRST (most reliable server-side check)
      // This is the primary method and should always be tried first
      try {
        const deviceId = getOrCreateDeviceId();
        const activeTicket = await api.getActiveTicketByDevice(config.slug, deviceId);
        
        if (activeTicket && (activeTicket.status === 'waiting' || activeTicket.status === 'in_progress')) {
          // Device has an active ticket - store it and redirect immediately
          console.log('[JoinPageGuard] Found active ticket by deviceId, redirecting to status:', activeTicket.id);
          localStorage.setItem(STORAGE_KEY, activeTicket.id.toString());
          navigate(`/status/${activeTicket.id}`, { replace: true });
          // Don't update state - let navigation handle it
          return;
        }
      } catch (error) {
        // Network error - retry once before falling back
        console.warn('[JoinPageGuard] Error checking by deviceId, retrying once:', error);
        
        try {
          // Retry the deviceId check once
          const deviceId = getOrCreateDeviceId();
          const activeTicket = await api.getActiveTicketByDevice(config.slug, deviceId);
          
          if (activeTicket && (activeTicket.status === 'waiting' || activeTicket.status === 'in_progress')) {
            console.log('[JoinPageGuard] Found active ticket by deviceId on retry, redirecting:', activeTicket.id);
            localStorage.setItem(STORAGE_KEY, activeTicket.id.toString());
            navigate(`/status/${activeTicket.id}`, { replace: true });
            return;
          }
        } catch (retryError) {
          // Retry also failed - fall through to localStorage check
          console.warn('[JoinPageGuard] Retry also failed, falling back to localStorage check:', retryError);
        }
      }

      // Step 2: Fallback to localStorage check (if deviceId check didn't find anything)
      const storedTicketId = localStorage.getItem(STORAGE_KEY);
      if (storedTicketId) {
        const ticketId = parseInt(storedTicketId, 10);
        if (!isNaN(ticketId)) {
          try {
            const ticket = await api.getTicket(ticketId);
            if (ticket && (ticket.status === 'waiting' || ticket.status === 'in_progress')) {
              // Found active ticket in localStorage - redirect immediately
              console.log('[JoinPageGuard] Found active ticket in localStorage, redirecting to status:', ticketId);
              navigate(`/status/${ticketId}`, { replace: true });
              // Don't update state - let navigation handle it
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

      // No active ticket found - safe to render JoinPage
      setShouldRenderJoinPage(true);
      setIsChecking(false);
    };

    checkActiveTicket();
  }, [navigate]);

  // Block rendering until check completes
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <Container className="pt-20 sm:pt-[100px] pb-12">
          <LoadingSpinner text="Verificando seu status..." />
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
