import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { JoinForm } from './JoinForm';
import { Container, Heading, Text, Stack } from '@/components/design-system';

const STORAGE_KEY = 'eutonafila_active_ticket_id';

export function JoinPage() {
  const [isCheckingStoredTicket, setIsCheckingStoredTicket] = useState(true);
  const navigate = useNavigate();

  // Check for stored ticket on mount
  useEffect(() => {
    const checkStoredTicket = async () => {
      const storedTicketId = localStorage.getItem(STORAGE_KEY);
      if (!storedTicketId) {
        setIsCheckingStoredTicket(false);
        return;
      }

      const ticketId = parseInt(storedTicketId, 10);
      if (isNaN(ticketId)) {
        localStorage.removeItem(STORAGE_KEY);
        setIsCheckingStoredTicket(false);
        return;
      }

      try {
        const ticket = await api.getTicket(ticketId);
        if (ticket && (ticket.status === 'waiting' || ticket.status === 'in_progress')) {
          navigate(`/status/${ticketId}`, { replace: true });
          return;
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsCheckingStoredTicket(false);
      }
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

      <Container className="relative z-10 pt-16 sm:pt-20 lg:pt-24 pb-10">
        {/* Desktop: Side-by-side layout */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-start">
          <div className="sticky top-24">
            <Stack spacing="lg">
              <div className="text-center lg:text-left">
                <Heading level={1} className="mb-4 text-3xl xl:text-4xl">
                  Entrar na Fila
                </Heading>
                <Text size="lg" variant="secondary" className="mb-6">
                  Preencha seus dados abaixo para entrar na fila virtual
                </Text>
              </div>
            </Stack>
          </div>

          <div>
            <JoinForm />
            <p className="text-center lg:text-left mt-6 text-sm text-[rgba(255,255,255,0.7)]">
              Já está na fila?{' '}
              <Link to="/home" className="text-[#D4AF37] hover:underline">
                Ver status
              </Link>
            </p>
          </div>
        </div>

        {/* Mobile: Stacked layout */}
        <div className="lg:hidden space-y-6 sm:space-y-8">
          <div className="text-center">
            <Heading level={1} className="mb-3 text-2xl sm:text-3xl">
              Entrar na Fila
            </Heading>
          </div>

          <JoinForm />

          <p className="text-center text-sm text-[rgba(255,255,255,0.7)]">
            Já está na fila?{' '}
            <Link to="/home" className="text-[#D4AF37] hover:underline">
              Ver status
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}
