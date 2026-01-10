import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { JoinForm } from './JoinForm';
import { Container, Heading } from '@/components/design-system';
import { STORAGE_KEYS } from '@/lib/constants';
import { getOrCreateDeviceId } from '@/lib/utils';
import { config } from '@/lib/config';

const STORAGE_KEY = STORAGE_KEYS.ACTIVE_TICKET_ID;

export function JoinPage() {
  const [isCheckingStoredTicket, setIsCheckingStoredTicket] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkStoredTicket = async () => {
      // Step 1: Synchronous check first - if no ticket in localStorage, check by deviceId
      const storedTicketId = localStorage.getItem(STORAGE_KEY);
      if (storedTicketId) {
        const ticketId = parseInt(storedTicketId, 10);
        if (!isNaN(ticketId)) {
          // Verify ticket exists and is active via API
          try {
            const ticket = await api.getTicket(ticketId);
            if (ticket && (ticket.status === 'waiting' || ticket.status === 'in_progress')) {
              // Ticket exists and is active - redirect immediately
              // Don't set isCheckingStoredTicket to false - let navigation handle it
              // This prevents the form from rendering briefly
              console.log('[JoinPage] Found active ticket in localStorage, redirecting to status:', ticketId);
              navigate(`/status/${ticketId}`, { replace: true });
              return; // Exit early, don't update state
            } else {
              // Ticket exists but is not active - clear it
              console.log('[JoinPage] Stored ticket is no longer active, clearing:', ticketId);
              localStorage.removeItem(STORAGE_KEY);
            }
          } catch (error) {
            // Ticket not found or error - clear invalid storage
            console.warn('[JoinPage] Error verifying stored ticket, clearing:', error);
            localStorage.removeItem(STORAGE_KEY);
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // Step 2: Check for active ticket by deviceId (secondary check)
      // This catches cases where localStorage was cleared but deviceId persists
      try {
        const deviceId = getOrCreateDeviceId();
        const activeTicket = await api.getActiveTicketByDevice(config.slug, deviceId);
        if (activeTicket && (activeTicket.status === 'waiting' || activeTicket.status === 'in_progress')) {
          // Device has an active ticket - store it and redirect
          console.log('[JoinPage] Found active ticket by deviceId, redirecting to status:', activeTicket.id);
          localStorage.setItem(STORAGE_KEY, activeTicket.id.toString());
          navigate(`/status/${activeTicket.id}`, { replace: true });
          return; // Exit early, don't update state
        }
      } catch (error) {
        // Error checking by deviceId - continue to show form
        console.warn('[JoinPage] Error checking active ticket by deviceId:', error);
      }

      // No active ticket found - show form
      setIsCheckingStoredTicket(false);
    };

    checkStoredTicket();
  }, [navigate]);

  if (isCheckingStoredTicket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
        <Navigation />
        <Container className="relative z-10 pt-20 sm:pt-[100px] pb-12">
          <LoadingSpinner text="Verificando seu status..." />
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.03)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />
      <Navigation />

      <Container className="relative z-10 pt-20 pb-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <Heading level={1} className="mb-8 text-3xl">
              Entrar na Fila
            </Heading>
          </div>

          <JoinForm />

          <p className="text-center text-sm text-[rgba(255,255,255,0.7)]">
            <Link to="/home" className="text-[#D4AF37] hover:underline">
              Ver status
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}
