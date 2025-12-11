import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { WaitTimeBanner } from './WaitTimeBanner';
import { JoinForm } from './JoinForm';

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
        <div className="container relative z-10 mx-auto px-4 sm:px-5 pt-20 sm:pt-[100px] pb-12">
          <LoadingSpinner text="Verificando seu status..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.03)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />
      <Navigation />
      
      {/* Mobile: Sticky wait time banner */}
      <div className="lg:hidden">
        <WaitTimeBanner sticky />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-10 max-w-7xl">
        {/* Desktop: Side-by-side layout (wait time left, form right) */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-start">
          <div className="sticky top-24">
            <div className="header text-center lg:text-left mb-8">
              <div className="header-icon w-20 h-20 mx-auto lg:mx-0 mb-6 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-4xl text-[#0a0a0a]">
                  person_add
                </span>
              </div>
              <h1 className="font-['Playfair_Display',serif] text-3xl xl:text-4xl font-semibold text-white mb-4">
                Entrar na Fila
              </h1>
              <p className="text-[rgba(255,255,255,0.7)] text-lg">
                Preencha seus dados abaixo para entrar na fila virtual
              </p>
            </div>
            <WaitTimeBanner />
          </div>

          <div>
            <JoinForm />
            <p className="info-text text-center lg:text-left mt-6 text-sm text-[rgba(255,255,255,0.7)]">
              Já está na fila?{' '}
              <Link to="/mineiro/home" className="text-[#D4AF37] hover:underline">
                Ver status
              </Link>
            </p>
          </div>
        </div>

        {/* Mobile: Stacked layout */}
        <div className="lg:hidden space-y-6 sm:space-y-8">
          <div className="header text-center">
            <div className="header-icon w-18 h-18 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-4xl text-[#0a0a0a]">
                person_add
              </span>
            </div>
            <h1 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl font-semibold text-white mb-3">
              Entrar na Fila
            </h1>
          </div>

          <JoinForm />

          <p className="info-text text-center text-sm text-[rgba(255,255,255,0.7)]">
            Já está na fila?{' '}
            <Link to="/mineiro/home" className="text-[#D4AF37] hover:underline">
              Ver status
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
