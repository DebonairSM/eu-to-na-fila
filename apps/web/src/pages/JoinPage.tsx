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

const STORAGE_KEY = 'eutonafila_active_ticket_id';

export function JoinPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAlreadyInQueue, setIsAlreadyInQueue] = useState(false);
  const [existingTicketId, setExistingTicketId] = useState<number | null>(null);
  const [nameCollisionError, setNameCollisionError] = useState<string | null>(null);
  const [isCheckingStoredTicket, setIsCheckingStoredTicket] = useState(true);
  const [waitEstimate, setWaitEstimate] = useState<number | null>(null);
  const [waitLoading, setWaitLoading] = useState(true);
  const [waitError, setWaitError] = useState<Error | null>(null);
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

  // Poll wait-debug for next-in-line estimate (API source of truth)
  useEffect(() => {
    let mounted = true;
    const fetchWait = async () => {
      try {
        setWaitError(null);
        const debug = await api.getWaitDebug(config.slug);
        if (!mounted) return;
        const nextWait =
          typeof debug.sampleEstimateForNext === 'number'
            ? debug.sampleEstimateForNext
            : null;
        setWaitEstimate(nextWait);
        setWaitLoading(false);
      } catch (err) {
        if (!mounted) return;
        setWaitError(err instanceof Error ? err : new Error('Erro ao obter tempo de espera'));
        setWaitLoading(false);
      }
    };

    fetchWait();
    const interval = setInterval(fetchWait, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

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
    
    // Clear name collision error when user changes their name
    if (nameCollisionError) {
      setNameCollisionError(null);
    }
  }, [firstName, lastName, validateName, nameCollisionError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsAlreadyInQueue(false);
    setExistingTicketId(null);
    setNameCollisionError(null);

    const validation = validateName(firstName, lastName);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Nome inválido');
      return;
    }

    const fullName = lastName.trim()
      ? `${firstName.trim()} ${lastName.trim()}`
      : firstName.trim();

    // Check if there's a stored ticket on this device
    const storedTicketId = localStorage.getItem(STORAGE_KEY);
    let deviceTicketId: number | null = null;
    if (storedTicketId) {
      const parsed = parseInt(storedTicketId, 10);
      if (!isNaN(parsed)) {
        deviceTicketId = parsed;
      }
    }

    // Only treat as same person if there's a stored ticket on this device
    if (deviceTicketId && data) {
      const deviceTicket = data.tickets.find(
        (t) => t.id === deviceTicketId && (t.status === 'waiting' || t.status === 'in_progress')
      );
      if (deviceTicket) {
        // This device has an active ticket - redirect to status
        setIsAlreadyInQueue(true);
        setExistingTicketId(deviceTicketId);
        return;
      } else {
        // Stored ticket is no longer active, clear it
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Check if name matches an existing ticket in queue
    // If it does but there's no stored ticket on this device, it's a different person
    if (data) {
      const nameMatchTicket = data.tickets.find(
        (t) =>
          t.customerName === fullName &&
          (t.status === 'waiting' || t.status === 'in_progress')
      );
      if (nameMatchTicket && nameMatchTicket.id !== deviceTicketId) {
        // Name matches but it's not this device's ticket - ask for different name
        setNameCollisionError('Este nome já está na fila. Por favor, use um nome diferente.');
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

      // Navigate to status page
      navigate(`/status/${ticket.id}`);
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
      <div className="container relative z-10 mx-auto px-4 sm:px-5 pt-16 sm:pt-[96px] pb-10 max-w-[520px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6 sm:space-y-7">
          {/* Header */}
          <div className="header text-center mb-6 sm:mb-8">
            <div className="header-icon w-16 h-16 sm:w-18 sm:h-18 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-3xl sm:text-4xl text-[#0a0a0a]">
                person_add
              </span>
            </div>
            <h1 className="font-['Playfair_Display',serif] text-xl sm:text-[1.75rem] font-semibold text-white mb-3">
              Entrar na Fila
            </h1>
          </div>

          {/* Wait Time Display */}
          {waitLoading || queueLoading ? (
            <div className="py-8">
              <LoadingSpinner text="Calculando tempo de espera..." />
            </div>
          ) : waitError || queueError ? (
            <div className="py-4">
              <ErrorDisplay 
                error={(waitError || queueError) as Error} 
                onRetry={() => window.location.reload()} 
              />
            </div>
          ) : (
            <WaitTimeDisplay minutes={waitEstimate} />
          )}

          {/* Form */}
          <div className="form-card bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg p-5 sm:p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* First Name */}
                <div className="input-group flex-1">
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
                    placeholder="Primeiro nome"
                    autoComplete="off"
                    required
                    className={`input-field w-full px-4 py-3 rounded-lg bg-[#2a2a2a] border transition-colors text-white placeholder:text-[rgba(255,255,255,0.5)]
                      focus:outline-none focus:ring-2 focus:ring-[#D4AF37]
                      ${validationError ? 'border-[#ef4444]' : 'border-[rgba(255,255,255,0.2)]'}
                    `}
                  />
                </div>

                {/* Last Name */}
                <div className="input-group sm:w-40">
                  <label
                    htmlFor="lastName"
                    className="input-label block text-xs font-medium text-[rgba(255,255,255,0.7)] uppercase tracking-wide mb-2"
                  >
                    Sobrenome
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Opcional"
                    autoComplete="off"
                    className="input-field w-full px-4 py-3 rounded-lg bg-[#2a2a2a] border border-[rgba(255,255,255,0.2)] transition-colors text-white placeholder:text-[rgba(255,255,255,0.5)]
                      focus:outline-none focus:ring-2 focus:ring-[#D4AF37]
                    "
                  />
                </div>
              </div>

              {validationError && (
                <div className="error-message mt-1 text-sm text-[#ef4444]">{validationError}</div>
              )}

              {nameCollisionError && (
                <div className="p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20">
                  <p className="text-sm text-[#ef4444]">{nameCollisionError}</p>
                </div>
              )}

              {/* Already in Queue Message */}
              {isAlreadyInQueue && existingTicketId && (
                <div className="p-4 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
                      info
                    </span>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-semibold text-[#D4AF37]">
                        Ticket ativo encontrado
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/status/${existingTicketId}`)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all"
                      >
                        Ver status
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
                disabled={isSubmitting || !!validationError || isAlreadyInQueue || !!nameCollisionError}
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
                    Entrando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">check</span>
                    Confirmar entrada
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info Text */}
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
