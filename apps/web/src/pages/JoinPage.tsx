import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useQueue } from '@/hooks/useQueue';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { WaitTimeDisplay } from '@/components/WaitTimeDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';
import { getErrorMessage } from '@/lib/utils';

const AVG_SERVICE_TIME = 20; // minutes
const STORAGE_KEY = 'eutonafila_active_ticket_id';

export function JoinPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAlreadyInQueue, setIsAlreadyInQueue] = useState(false);
  const [existingTicketId, setExistingTicketId] = useState<number | null>(null);
  const [isCheckingStoredTicket, setIsCheckingStoredTicket] = useState(true);
  const navigate = useNavigate();
  const { validateName } = useProfanityFilter();
  const { data, isLoading: queueLoading, error: queueError } = useQueue(30000); // Poll every 30s

  // Check for stored ticket on mount (only once)
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
        // Verify ticket still exists and is active
        const ticket = await api.getTicket(ticketId);
        if (ticket && (ticket.status === 'waiting' || ticket.status === 'in_progress')) {
          // Ticket is still active, redirect to status page
          navigate(`/status/${ticketId}`, { replace: true });
          return;
        } else {
          // Ticket is completed or cancelled, clear storage
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        // Ticket not found or error, clear storage
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsCheckingStoredTicket(false);
      }
    };

    checkStoredTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Calculate wait time
  const waitTime = (() => {
    if (!data) return null;
    const waitingCount = data.tickets.filter((t) => t.status === 'waiting').length;
    const presentBarbers = data.tickets
      .filter((t) => t.status === 'in_progress')
      .map((t) => t.barberId)
      .filter((id): id is number => id !== null);
    const activeBarbers = new Set(presentBarbers).size || 1;

    if (waitingCount === 0) return 0;
    const estimated = Math.ceil((waitingCount / activeBarbers) * AVG_SERVICE_TIME);
    return Math.max(5, Math.round(estimated / 5) * 5); // Round to nearest 5
  })();

  // Real-time validation
  useEffect(() => {
    if (firstName.trim().length === 0) {
      setValidationError(null);
      return;
    }

    const validation = validateName(firstName, lastName);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Nome inválido');
    } else {
      setValidationError(null);
    }
  }, [firstName, lastName, validateName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsAlreadyInQueue(false);
    setExistingTicketId(null);

    const validation = validateName(firstName, lastName);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Nome inválido');
      return;
    }

    const fullName = lastName.trim()
      ? `${firstName.trim()} ${lastName.trim()}`
      : firstName.trim();

    // Check if customer is already in queue before submitting
    if (data) {
      const existingTicket = data.tickets.find(
        (t) =>
          t.customerName === fullName &&
          (t.status === 'waiting' || t.status === 'in_progress')
      );
      if (existingTicket) {
        setIsAlreadyInQueue(true);
        setExistingTicketId(existingTicket.id);
        // Store ticket ID in localStorage
        localStorage.setItem(STORAGE_KEY, existingTicket.id.toString());
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const ticket = await api.createTicket(config.slug, {
        customerName: fullName,
        serviceId: 1, // Default service
      });

      // Store ticket ID in localStorage for persistence
      localStorage.setItem(STORAGE_KEY, ticket.id.toString());

      // Check if this is likely an existing ticket (created more than 1 second ago)
      // If the ticket was just created, createdAt should be very recent
      const ticketAge = Date.now() - new Date(ticket.createdAt).getTime();
      const isExistingTicket = ticketAge > 1000; // More than 1 second old

      if (isExistingTicket) {
        setIsAlreadyInQueue(true);
        setExistingTicketId(ticket.id);
      } else {
        navigate(`/status/${ticket.id}`);
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Erro ao entrar na fila. Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking stored ticket
  if (isCheckingStoredTicket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
        <Navigation />
        <div className="container relative z-10 mx-auto px-4 sm:px-5 pt-20 sm:pt-[100px] pb-12 max-w-[480px]">
          <LoadingSpinner text="Verificando seu status..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.03)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />
      <Navigation />
      <div className="container relative z-10 mx-auto px-4 sm:px-5 pt-20 sm:pt-[100px] pb-12 max-w-[480px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          {/* Header */}
          <div className="header text-center mb-6 sm:mb-8">
            <div className="header-icon w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-3xl sm:text-4xl text-[#0a0a0a]">
                person_add
              </span>
            </div>
            <h1 className="font-['Playfair_Display',serif] text-xl sm:text-[1.75rem] font-semibold text-white mb-3">
              Entrar na Fila
            </h1>
            <p className="subtitle text-sm sm:text-base text-[rgba(255,255,255,0.7)]">Adicione seu nome e aguarde ser chamado</p>
          </div>

          {/* Wait Time Display */}
          {queueLoading ? (
            <div className="py-8">
              <LoadingSpinner text="Calculando tempo de espera..." />
            </div>
          ) : queueError ? (
            <div className="py-4">
              <ErrorDisplay 
                error={queueError} 
                onRetry={() => window.location.reload()} 
              />
            </div>
          ) : (
            <WaitTimeDisplay minutes={waitTime} />
          )}

          {/* Form */}
          <div className="form-card bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First Name */}
              <div className="input-group">
                <label
                  htmlFor="firstName"
                  className="input-label block text-xs font-medium text-[rgba(255,255,255,0.7)] uppercase tracking-wide mb-2"
                >
                  Nome *
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Seu primeiro nome"
                  autoComplete="off"
                  required
                  className={`input-field w-full px-4 py-3 rounded-lg bg-[#2a2a2a] border transition-colors text-white placeholder:text-[rgba(255,255,255,0.5)]
                    focus:outline-none focus:ring-2 focus:ring-[#D4AF37]
                    ${validationError ? 'border-[#ef4444]' : 'border-[rgba(255,255,255,0.2)]'}
                  `}
                />
                {validationError && (
                  <div className="error-message mt-2 text-sm text-[#ef4444]">{validationError}</div>
                )}
              </div>

              {/* Last Name */}
              <div className="input-group">
                <label
                  htmlFor="lastName"
                  className="input-label block text-xs font-medium text-[rgba(255,255,255,0.7)] uppercase tracking-wide mb-2"
                >
                  Sobrenome (opcional)
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Seu sobrenome"
                  autoComplete="off"
                  className="input-field w-full px-4 py-3 rounded-lg bg-[#2a2a2a] border border-[rgba(255,255,255,0.2)] transition-colors text-white placeholder:text-[rgba(255,255,255,0.5)]
                    focus:outline-none focus:ring-2 focus:ring-[#D4AF37]
                  "
                />
              </div>

              {/* Already in Queue Message */}
              {isAlreadyInQueue && existingTicketId && (
                <div className="p-4 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                  <div className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-[#D4AF37] text-3xl">
                      info
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#D4AF37] mb-2">
                        Você já está na fila!
                      </p>
                      <p className="text-sm text-[rgba(255,255,255,0.8)] mb-3">
                        Você já possui um ticket ativo na fila. Clique no botão abaixo para ver seu status.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/status/${existingTicketId}`)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all"
                      >
                        Ver Meu Status
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Error */}
              {submitError && (
                <div className="p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20">
                  <p className="text-sm text-[#ef4444]">{submitError}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="submit-btn w-full px-6 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg flex items-center justify-center gap-3 hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !!validationError || isAlreadyInQueue}
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
                    Entrando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">check</span>
                    Entrar na Fila
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info Text */}
          <p className="info-text text-center text-sm text-[rgba(255,255,255,0.7)]">
            Já está na fila?{' '}
            <Link to="/" className="text-[#D4AF37] hover:underline">
              Verificar status
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
