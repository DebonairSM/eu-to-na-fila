import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useQueue } from '@/hooks/useQueue';
import { useBarbers } from '@/hooks/useBarbers';
import { useKiosk } from '@/hooks/useKiosk';
import { useModal } from '@/hooks/useModal';
import { Navigation } from '@/components/Navigation';
import { Modal } from '@/components/Modal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { BarberSelector } from '@/components/BarberSelector';
import { BarberCard } from '@/components/BarberCard';
import { QueueCard } from '@/components/QueueCard';
import { QRCode } from '@/components/QRCode';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Button } from '@/components/ui/button';
import { GrandeTechAd } from '@/components/GrandeTechAd';
import { Ad2Video } from '@/components/Ad2Video';
import { Ad3Video } from '@/components/Ad3Video';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { useErrorTimeout } from '@/hooks/useErrorTimeout';
import { cn, getErrorMessage, formatName, formatNameForDisplay } from '@/lib/utils';

const QUEUE_VIEW_DURATION = 15000; // 15 seconds
const AD_VIEW_DURATION = 15000; // 15 seconds

export function BarberQueueManager() {
  const [searchParams] = useSearchParams();
  const { barbers, togglePresence, refetch: refetchBarbers } = useBarbers();
  const {
    isKioskMode,
    currentView,
    isInRotation,
    enterKioskMode,
    exitKioskMode,
    showQueueView,
  } = useKiosk();
  
  // Use longer polling interval in kiosk mode to improve performance
  const pollInterval = isKioskMode ? 10000 : 5000; // 10s for kiosk, 5s for management
  const { data: queueData, isLoading: queueLoading, error: queueError, refetch: refetchQueue } = useQueue(pollInterval);
  
  const checkInModal = useModal();
  const barberSelectorModal = useModal();
  const removeConfirmModal = useModal();
  const completeConfirmModal = useModal();
  const { validateName } = useProfanityFilter();

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerToRemove, setCustomerToRemove] = useState<number | null>(null);
  const [customerToComplete, setCustomerToComplete] = useState<number | null>(null);
  const [checkInName, setCheckInName] = useState({ first: '', last: '' });
  const [preferredBarberId, setPreferredBarberId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const firstNameInputRef = useRef<HTMLInputElement>(null);

  // Enter kiosk mode if ?kiosk=true in URL
  useEffect(() => {
    if (searchParams.get('kiosk') === 'true' && !isKioskMode) {
      enterKioskMode();
    }
  }, [searchParams, isKioskMode, enterKioskMode]);

  // Auto-focus first name input when check-in modal opens
  useEffect(() => {
    if (checkInModal.isOpen && firstNameInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        firstNameInputRef.current?.focus();
      }, 100);
    }
  }, [checkInModal.isOpen]);

  // Preload barber avatar images when barbers data is available
  useEffect(() => {
    if (barbers.length === 0) return;

    barbers.forEach((barber) => {
      // Preload custom avatar URL if available
      if (barber.avatarUrl) {
        const img = new Image();
        img.src = barber.avatarUrl;
        // Handle errors silently - component will handle fallback
        img.onerror = () => {};
      }

      // Preload fallback avatar URL (ui-avatars.com)
      const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=D4AF37&color=000&size=128`;
      const fallbackImg = new Image();
      fallbackImg.src = fallbackUrl;
      // Handle errors silently
      fallbackImg.onerror = () => {};
    });
  }, [barbers]);

  const tickets = queueData?.tickets || [];
  
  // Memoize sorted tickets and counts to avoid recalculation on every render
  const { sortedTickets, waitingCount, servingCount } = useMemo(() => {
    const waitingTickets = tickets.filter((t) => t.status === 'waiting');
    const inProgressTickets = tickets.filter((t) => t.status === 'in_progress');
    
    // Sort waiting tickets by position (or createdAt as fallback) to ensure correct order
    const sortedWaitingTickets = [...waitingTickets].sort((a, b) => {
      // First try to sort by position
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      // If positions are equal or invalid, sort by creation time
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    return {
      sortedTickets: [...sortedWaitingTickets, ...inProgressTickets],
      waitingCount: waitingTickets.length,
      servingCount: inProgressTickets.length,
    };
  }, [tickets]);

  // Memoize sorted barbers by ID to maintain consistent order in kiosk display
  const sortedBarbers = useMemo(() => {
    return [...barbers].sort((a, b) => a.id - b.id);
  }, [barbers]);

  const handleAddCustomer = useCallback(async () => {
    const validation = validateName(checkInName.first, checkInName.last);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Nome inválido');
      return;
    }

    const fullName = checkInName.last.trim()
      ? `${formatName(checkInName.first.trim())} ${formatName(checkInName.last.trim())}`
      : formatName(checkInName.first.trim());

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.createTicket(config.slug, {
        customerName: fullName,
        serviceId: 1,
        ...(preferredBarberId && { preferredBarberId }),
      });
      setCheckInName({ first: '', last: '' });
      setPreferredBarberId(null);
      checkInModal.close();
      await refetchQueue();
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Erro ao adicionar cliente. Tente novamente.');
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [checkInName, preferredBarberId, validateName, refetchQueue, checkInModal]);

  const handleSelectBarber = useCallback(async (barberId: number | null) => {
    if (!selectedCustomerId) return;

    try {
      if (barberId === null) {
        await api.updateTicket(selectedCustomerId, {
          barberId: null,
          status: 'waiting',
        });
      } else {
        await api.updateTicket(selectedCustomerId, {
          barberId,
          status: 'in_progress',
        });
      }
      await refetchQueue();
      barberSelectorModal.close();
      setSelectedCustomerId(null);
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Erro ao atribuir barbeiro. Tente novamente.');
      setErrorMessage(errorMsg);
    }
  }, [selectedCustomerId, refetchQueue, barberSelectorModal]);

  const handleRemoveCustomer = useCallback(async () => {
    if (!customerToRemove) return;

    try {
      await api.cancelTicketAsStaff(customerToRemove);
      await refetchQueue();
      removeConfirmModal.close();
      setCustomerToRemove(null);
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Erro ao remover cliente. Tente novamente.');
      setErrorMessage(errorMsg);
      removeConfirmModal.close();
    }
  }, [customerToRemove, refetchQueue, removeConfirmModal]);

  const handleCompleteService = useCallback(async () => {
    if (!customerToComplete) return;

    try {
      await api.updateTicket(customerToComplete, {
        status: 'completed',
      });
      await refetchQueue();
      completeConfirmModal.close();
      setCustomerToComplete(null);
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Erro ao finalizar atendimento. Tente novamente.');
      setErrorMessage(errorMsg);
      completeConfirmModal.close();
    }
  }, [customerToComplete, refetchQueue, completeConfirmModal]);

  const handleReturnToQueue = useCallback(async (ticketId: number) => {
    try {
      await api.updateTicket(ticketId, {
        barberId: null,
        status: 'waiting',
      });
      await refetchQueue();
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Erro ao retornar cliente para a fila. Tente novamente.');
      setErrorMessage(errorMsg);
    }
  }, [refetchQueue]);

  const getAssignedBarber = useCallback((ticket: { barberId?: number | null }) => {
    if (!ticket.barberId) return null;
    return barbers.find((b) => b.id === ticket.barberId) || null;
  }, [barbers]);

  // Auto-clear error messages after timeout
  useErrorTimeout(errorMessage, () => setErrorMessage(null));

  // Kiosk Mode View
  if (isKioskMode) {
    const joinUrl = `${window.location.origin}/mineiro/join`;

    return (
      <div className="fixed inset-0 bg-black text-white z-50 overflow-hidden flex flex-col">
        {/* Error Message Toast */}
        {errorMessage && (
          <div 
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] bg-[#ef4444] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 max-w-[calc(100%-2rem)] sm:max-w-md"
            role="alert"
            aria-live="assertive"
          >
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <p className="flex-1 text-sm sm:text-base">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-white/80 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Fechar mensagem de erro"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* Exit Button - Subtle in corner */}
        <button
          onClick={exitKioskMode}
          className="absolute top-6 left-6 z-50 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
          aria-label="Exit kiosk mode"
        >
          <span className="material-symbols-outlined text-white/50 text-base">settings</span>
        </button>

        {/* QR Code - Top right */}
        <div className="absolute top-6 right-6 z-50 bg-white p-0.5 shadow-2xl border-2 border-[#D4AF37] flex items-center justify-center">
          <QRCode url={joinUrl} size={60} />
        </div>

        {/* Main Content */}
        {currentView === 'queue' && (
          <div className="flex-1 flex flex-col h-full">
            {/* Header with Shop Name / Check-in Button */}
            <header className="flex-shrink-0 pt-8 pb-6 text-center border-b border-[rgba(212,175,55,0.15)]">
              <button
                onClick={() => {
                  checkInModal.open();
                  showQueueView();
                }}
                className="inline-flex items-center gap-4 px-10 py-4 bg-[#D4AF37] text-black rounded-2xl font-semibold text-xl hover:bg-[#E8C547] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(212,175,55,0.5)] transition-all"
                aria-label="Adicionar cliente à fila"
              >
                <span className="material-symbols-outlined text-2xl">person_add</span>
                <span className="font-['Playfair_Display',serif] text-2xl tracking-wide uppercase">{config.name}</span>
              </button>
            </header>

            {/* Queue List - Centered with proper spacing */}
            <div className="flex-1 overflow-y-auto py-8 px-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {sortedTickets.length === 0 ? (
                  <div className="text-center py-20">
                    <span className="material-symbols-outlined text-7xl text-white/20 mb-6 block">groups</span>
                    <p className="text-2xl text-white/40 font-light">Nenhum cliente na fila</p>
                    <p className="text-lg text-white/30 mt-2">Toque no botão acima para adicionar</p>
                  </div>
                ) : (
                  sortedTickets.map((ticket, index) => {
                    const assignedBarber = getAssignedBarber(ticket);
                    const isServing = ticket.status === 'in_progress';
                    // Calculate display position based on index in sorted waiting tickets
                    const displayPosition = isServing ? null : index + 1;

                    return (
                      <div
                        key={ticket.id}
                        className={cn(
                          'w-full px-8 py-6 rounded-2xl border transition-all',
                          'hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
                          {
                            'bg-black border-[rgba(212,175,55,0.4)] hover:border-[rgba(212,175,55,0.6)]': isServing,
                            'bg-[rgba(20,20,20,0.8)] border-[rgba(212,175,55,0.2)] hover:border-[rgba(212,175,55,0.4)]': !isServing,
                          }
                        )}
                      >
                        <div className="flex items-center gap-6">
                          {/* Position Badge / Complete Button */}
                          {isServing ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomerToComplete(ticket.id);
                                completeConfirmModal.open();
                                showQueueView();
                              }}
                              className={cn(
                                'w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0',
                                'bg-black text-[#D4AF37] border border-[#D4AF37] hover:bg-black hover:text-[#E8C547] hover:border-[#E8C547] transition-all cursor-pointer',
                                'hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-0'
                              )}
                              aria-label={`Finalizar atendimento de ${ticket.customerName}`}
                            >
                              <span className="material-symbols-outlined text-3xl">check</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomerId(ticket.id);
                                barberSelectorModal.open();
                                showQueueView();
                              }}
                              className={cn(
                                'w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0',
                                'bg-black text-[#D4AF37] border border-[#D4AF37] hover:text-[#E8C547] hover:border-[#E8C547] transition-all cursor-pointer',
                                'hover:scale-110 active:scale-95'
                              )}
                              aria-label={`Atribuir barbeiro para ${ticket.customerName}`}
                            >
                              {displayPosition}
                            </button>
                          )}
                          {/* Customer Info - Clickable to assign barber */}
                          <button
                            onClick={() => {
                              setSelectedCustomerId(ticket.id);
                              barberSelectorModal.open();
                              showQueueView();
                            }}
                            className="flex-1 min-w-0 text-left"
                            aria-label={`Atribuir barbeiro para ${ticket.customerName}`}
                          >
                            <p className="font-semibold text-2xl text-white truncate">{formatNameForDisplay(ticket.customerName)}</p>
                            {assignedBarber && (
                              <p className="text-lg text-white/60 mt-1 truncate flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">content_cut</span>
                                {assignedBarber.name}
                              </p>
                            )}
                            {(() => {
                              const preferredBarberId = 'preferredBarberId' in ticket ? (ticket as { preferredBarberId?: number }).preferredBarberId : undefined;
                              return preferredBarberId && (!assignedBarber || assignedBarber.id !== preferredBarberId) ? (() => {
                                const preferredBarber = barbers.find((b) => b.id === preferredBarberId);
                                return preferredBarber ? (
                                  <p className="text-base text-[#D4AF37]/80 mt-1 truncate flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">star</span>
                                    Preferência: {preferredBarber.name}
                                  </p>
                                ) : null;
                              })() : null;
                            })()}
                          </button>
                          {/* Status indicator */}
                          {isServing && (
                            <div className="flex-shrink-0 px-4 py-2 bg-[rgba(212,175,55,0.2)] border border-[rgba(212,175,55,0.4)] rounded-xl">
                              <span className="text-[#D4AF37] text-sm font-medium uppercase tracking-wider">Atendendo</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Bar - Barber Presence */}
            <footer className="flex-shrink-0 py-6 px-8 border-t border-[rgba(212,175,55,0.15)] bg-[rgba(10,10,10,0.95)]">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {sortedBarbers.map((barber) => (
                    <button
                      key={barber.id}
                      onClick={async () => {
                        try {
                          await togglePresence(barber.id, !barber.isPresent);
                          await refetchBarbers();
                          await refetchQueue();
                        } catch (error) {
                          const errorMsg = getErrorMessage(error, 'Erro ao alterar presença do barbeiro. Tente novamente.');
                          setErrorMessage(errorMsg);
                        }
                      }}
                      className={cn(
                        'px-6 py-3 rounded-xl border-2 font-medium transition-all text-lg',
                        barber.isPresent
                          ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                          : 'bg-black/50 border-[rgba(212,175,55,0.3)] text-[#D4AF37]/60'
                      )}
                      aria-label={`${barber.isPresent ? 'Marcar ausente' : 'Marcar presente'}: ${barber.name}`}
                    >
                      {barber.name}
                    </button>
                  ))}
                </div>
              </div>
            </footer>
          </div>
        )}

        {/* Ad Views */}
        {currentView === 'ad1' && (
          <div 
            className="flex-1 flex items-center justify-center relative cursor-pointer min-h-0 max-h-screen overflow-hidden"
            onClick={showQueueView}
          >
            <GrandeTechAd showTimer={false} />
          </div>
        )}
        {currentView === 'ad2' && (
          <div 
            className="flex-1 flex items-center justify-center relative cursor-pointer min-h-0 max-h-screen overflow-hidden"
            onClick={showQueueView}
          >
            <Ad2Video showTimer={false} />
          </div>
        )}
        {currentView === 'ad3' && (
          <div 
            className="flex-1 flex items-center justify-center relative cursor-pointer min-h-0 max-h-screen overflow-hidden"
            onClick={showQueueView}
          >
            <Ad3Video showTimer={false} />
          </div>
        )}

        {/* Progress Bar */}
        {isInRotation && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-[#D4AF37]"
              style={{
                width: '100%',
                animation: `progress ${currentView === 'queue' ? QUEUE_VIEW_DURATION : AD_VIEW_DURATION}ms linear`,
              }}
            />
          </div>
        )}

        {/* Kiosk Modals - Styled for fullscreen display */}
        {/* Check-in Modal */}
        {checkInModal.isOpen && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-8">
            <div className="bg-[#1a1a1a] border-2 border-[#D4AF37]/30 rounded-3xl p-6 sm:p-8 lg:p-10 max-w-2xl w-full min-w-[320px]">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-['Playfair_Display',serif] text-[#D4AF37] mb-6 sm:mb-8 text-center">
                Entrar na Fila
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddCustomer();
                }}
                className="space-y-4 sm:space-y-6"
              >
                <div>
                  <label htmlFor="kioskGuestName" className="block text-lg sm:text-xl font-medium mb-2 sm:mb-3 text-white">
                    Nome *
                  </label>
                  <input
                    ref={firstNameInputRef}
                    id="kioskGuestName"
                    type="text"
                    value={checkInName.first}
                    onChange={(e) => setCheckInName({ ...checkInName, first: formatName(e.target.value) })}
                    placeholder="Primeiro nome"
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck="false"
                    inputMode="text"
                    required
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 lg:py-5 text-lg sm:text-xl lg:text-2xl rounded-2xl bg-white/10 border-2 border-white/20 text-white min-h-[44px] placeholder:text-white/40 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label htmlFor="kioskGuestLastName" className="block text-lg sm:text-xl font-medium mb-2 sm:mb-3 text-white">
                    Inicial do sobrenome
                  </label>
                  <input
                    id="kioskGuestLastName"
                    type="text"
                    value={checkInName.last}
                    onChange={(e) => setCheckInName({ ...checkInName, last: e.target.value.slice(0, 1).toUpperCase() })}
                    placeholder="Inicial"
                    inputMode="text"
                    maxLength={1}
                    className="w-12 px-4 sm:px-6 py-3 sm:py-4 lg:py-5 text-lg sm:text-xl lg:text-2xl rounded-2xl bg-white/10 border-2 border-white/20 text-white min-h-[44px] placeholder:text-white/40 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-xl font-medium mb-3 text-white">
                    Barbeiro Preferido (opcional)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPreferredBarberId(null)}
                      className={cn(
                        'px-4 py-3 rounded-xl border-2 text-lg font-medium transition-all text-center',
                        preferredBarberId === null
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                          : 'bg-white/5 border-white/20 text-white/70 hover:border-white/40'
                      )}
                    >
                      Nenhum
                    </button>
                    {sortedBarbers.map((barber) => {
                      const isSelected = preferredBarberId === barber.id;
                      const isAbsent = !barber.isPresent;
                      
                      return (
                        <button
                          key={barber.id}
                          type="button"
                          onClick={() => setPreferredBarberId(barber.id)}
                          className={cn(
                            'px-4 py-3 rounded-xl border-2 text-lg font-medium transition-all text-center',
                            isSelected
                              ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                              : isAbsent
                                ? 'bg-white/5 border-white/10 text-white/40 opacity-60'
                                : 'bg-white/5 border-white/20 text-white hover:border-[#D4AF37]/50'
                          )}
                        >
                          {barber.name}
                          {isAbsent && (
                            <span className="block text-xs text-white/40 mt-1">Indisponível</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8">
                  <button
                    type="button"
                    onClick={checkInModal.close}
                    className="flex-1 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-base sm:text-lg lg:text-xl rounded-2xl bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 transition-all min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-base sm:text-lg lg:text-xl rounded-2xl bg-[#D4AF37] text-black font-semibold hover:bg-[#E8C547] transition-all disabled:opacity-50 min-h-[44px]"
                  >
                    {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Barber Selector Modal */}
        {barberSelectorModal.isOpen && selectedCustomerId && (() => {
          const selectedTicket = tickets.find((t) => t.id === selectedCustomerId);
          const currentBarberId = selectedTicket?.barberId || null;
          const preferredBarberId = (selectedTicket && 'preferredBarberId' in selectedTicket) 
            ? ((selectedTicket as { preferredBarberId?: number }).preferredBarberId ?? null)
            : null;
          
          // Calculate which barbers are busy (have an in_progress ticket)
          // Exclude the current ticket being edited
          const busyBarberIds = new Set<number>();
          tickets.forEach((ticket) => {
            if (
              ticket.status === 'in_progress' &&
              ticket.barberId &&
              ticket.id !== selectedCustomerId
            ) {
              busyBarberIds.add(ticket.barberId);
            }
          });
          
          // Sort barbers: preferred barber first, then others
          const sortedBarbersForSelection = [...barbers.filter(b => b.isPresent)].sort((a, b) => {
            const aIsPreferred = a.id === preferredBarberId;
            const bIsPreferred = b.id === preferredBarberId;
            if (aIsPreferred && !bIsPreferred) return -1;
            if (!aIsPreferred && bIsPreferred) return 1;
            return 0;
          });
          
          return (
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-8">
              <div className="bg-[#1a1a1a] border-2 border-[#D4AF37]/30 rounded-3xl p-10 max-w-3xl w-full">
                <h2 className="text-4xl font-['Playfair_Display',serif] text-[#D4AF37] mb-3 text-center">
                  Selecionar Barbeiro
                </h2>
                <p className="text-xl text-white/70 mb-8 text-center">
                  {selectedTicket?.customerName}
                </p>
                {preferredBarberId && (
                  <p className="text-lg text-[#D4AF37]/80 mb-4 text-center flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-xl">star</span>
                    Preferência: {barbers.find(b => b.id === preferredBarberId)?.name}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {sortedBarbersForSelection.map((barber) => {
                    const isBusy = busyBarberIds.has(barber.id);
                    const isCurrentlyAssigned = currentBarberId === barber.id;
                    const isPreferred = barber.id === preferredBarberId;
                    const isDisabled = isBusy && !isCurrentlyAssigned;
                    
                    return (
                      <button
                        key={barber.id}
                        onClick={() => {
                          // If clicking the same barber, unassign
                          if (isCurrentlyAssigned) {
                            handleSelectBarber(null);
                          } else if (!isBusy) {
                            handleSelectBarber(barber.id);
                          }
                        }}
                        disabled={isDisabled}
                        className={cn(
                          'p-6 rounded-2xl border-2 transition-all text-xl font-medium relative',
                          isCurrentlyAssigned
                            ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                            : isDisabled
                              ? 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed opacity-50'
                              : isPreferred
                                ? 'bg-[#D4AF37]/10 border-[#D4AF37]/50 text-white hover:border-[#D4AF37]'
                                : 'bg-white/5 border-white/20 text-white hover:border-[#D4AF37]/50'
                        )}
                        title={isDisabled ? 'Atendendo outro cliente' : isPreferred ? 'Barbeiro preferido' : undefined}
                      >
                        {isPreferred && !isCurrentlyAssigned && (
                          <span className="absolute top-2 right-2 material-symbols-outlined text-[#D4AF37] text-lg">star</span>
                        )}
                        {barber.name}
                        {isDisabled && (
                          <span className="block text-sm text-white/40 mt-1">Atendendo outro cliente</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {currentBarberId && (
                  <div className="mb-4 pb-4 border-b border-white/10">
                    <button
                      onClick={() => handleSelectBarber(null)}
                      className="w-full px-8 py-5 text-xl rounded-2xl bg-white/5 border-2 border-white/20 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all"
                    >
                      Remover Atribuição
                    </button>
                  </div>
                )}
                <div className="mb-4 pb-4 border-b border-white/10">
                  <button
                    onClick={() => {
                      setCustomerToRemove(selectedCustomerId);
                      barberSelectorModal.close();
                      removeConfirmModal.open();
                      showQueueView();
                    }}
                    className="w-full px-8 py-5 text-xl rounded-2xl bg-[#ef4444]/20 border-2 border-[#ef4444]/50 text-[#ef4444] hover:bg-[#ef4444]/30 hover:border-[#ef4444] transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">delete</span>
                    Remover da Fila
                  </button>
                </div>
                <button
                  onClick={barberSelectorModal.close}
                  className="w-full px-8 py-5 text-xl rounded-2xl bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          );
        })()}

        {/* Complete Confirmation Modal */}
        {completeConfirmModal.isOpen && customerToComplete && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-8">
            <div className="bg-[#1a1a1a] border-2 border-[#D4AF37]/30 rounded-3xl p-10 max-w-2xl w-full">
              <h2 className="text-4xl font-['Playfair_Display',serif] text-[#D4AF37] mb-4 text-center">
                Finalizar Atendimento
              </h2>
              <p className="text-2xl text-white/70 mb-8 text-center">
                Tem certeza que deseja finalizar o atendimento de{' '}
                <span className="font-semibold text-white">
                  {tickets.find((t) => t.id === customerToComplete)?.customerName}
                </span>?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    completeConfirmModal.close();
                    setCustomerToComplete(null);
                  }}
                  className="flex-1 px-8 py-5 text-xl rounded-2xl bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await handleCompleteService();
                    showQueueView();
                  }}
                  className="flex-1 px-8 py-5 text-xl rounded-2xl bg-white text-black font-semibold hover:bg-white/80 transition-all"
                >
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Confirmation Modal */}
        {removeConfirmModal.isOpen && customerToRemove && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-8">
            <div className="bg-[#1a1a1a] border-2 border-[#ef4444]/30 rounded-3xl p-10 max-w-2xl w-full">
              <h2 className="text-4xl font-['Playfair_Display',serif] text-[#ef4444] mb-4 text-center">
                Remover da Fila
              </h2>
              <p className="text-2xl text-white/70 mb-8 text-center">
                Tem certeza que deseja remover{' '}
                <span className="font-semibold text-white">
                  {tickets.find((t) => t.id === customerToRemove)?.customerName}
                </span>{' '}
                da fila?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    removeConfirmModal.close();
                    setCustomerToRemove(null);
                  }}
                  className="flex-1 px-8 py-5 text-xl rounded-2xl bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await handleRemoveCustomer();
                    showQueueView();
                  }}
                  className="flex-1 px-8 py-5 text-xl rounded-2xl bg-[#ef4444] text-white font-semibold hover:bg-[#ef4444]/80 transition-all"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Management Mode View
  return (
    <div className="min-h-screen bg-black p-3 sm:p-4 pb-20">
      <Navigation />
      {/* Error Message Toast */}
      {errorMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#ef4444] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 max-w-[calc(100%-2rem)] sm:max-w-md"
          role="alert"
          aria-live="assertive"
        >
          <span className="material-symbols-outlined" aria-hidden="true">error</span>
          <p className="flex-1 text-sm sm:text-base">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-white/80 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Fechar mensagem de erro"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      <div className="container max-w-[600px] mx-auto pt-20 sm:pt-24">
        {/* Stats Header */}
        <div className="header bg-[rgba(20,20,20,0.9)] border-[3px] border-[rgba(212,175,55,0.3)] rounded-xl p-4 sm:p-6 mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <div className="stats flex gap-4 sm:gap-6">
            <div className="stat-item flex-1 text-center">
              <div className="stat-value text-2xl sm:text-3xl font-semibold text-[#D4AF37]">{waitingCount}</div>
              <div className="stat-label text-xs text-[rgba(255,255,255,0.7)] mt-1">Aguardando</div>
            </div>
            <div className="stat-item flex-1 text-center">
              <div className="stat-value text-2xl sm:text-3xl font-semibold text-white">{servingCount}</div>
              <div className="stat-label text-xs text-[rgba(255,255,255,0.7)] mt-1">Atendendo</div>
            </div>
          </div>
        </div>

        {/* Queue Section */}
        <div className="queue-section bg-[rgba(20,20,20,0.9)] border-[3px] border-[rgba(212,175,55,0.3)] rounded-xl p-4 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          {/* Add Customer Button */}
          <div className="queue-header mb-6">
            <button
              onClick={checkInModal.open}
              className="checkin-btn flex items-center justify-center gap-3 px-8 py-4 bg-[#D4AF37] text-[#000000] border-2 border-[#D4AF37] rounded-lg font-semibold w-full transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] hover:bg-[rgba(212,175,55,0.9)]"
            >
              <span className="material-symbols-outlined text-xl">person_add</span>
              Adicionar Cliente
            </button>
          </div>

          {/* Queue List */}
          {queueLoading ? (
            <div className="space-y-3" aria-busy="true" aria-live="polite">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-md border border-white/8 bg-white/5 animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : queueError ? (
            <ErrorDisplay error={queueError} onRetry={refetchQueue} />
          ) : (
            <div className="space-y-3" aria-live="polite">
              {sortedTickets.length === 0 ? (
                <div className="text-center py-12 text-[rgba(255,255,255,0.7)]">
                  Nenhum cliente na fila
                </div>
              ) : (
                sortedTickets.map((ticket, index) => {
                  const assignedBarber = getAssignedBarber(ticket);
                  const isServing = ticket.status === 'in_progress';
                  // Calculate display position based on index in sorted waiting tickets
                  const displayPosition = isServing ? null : index + 1;
                  return (
                    <QueueCard
                      key={ticket.id}
                      ticket={ticket}
                      assignedBarber={assignedBarber}
                      barbers={barbers}
                      displayPosition={displayPosition}
                      onClick={() => {
                        setSelectedCustomerId(ticket.id);
                        barberSelectorModal.open();
                      }}
                      onRemove={() => {
                        setCustomerToRemove(ticket.id);
                        removeConfirmModal.open();
                      }}
                      onComplete={() => {
                        setCustomerToComplete(ticket.id);
                        completeConfirmModal.open();
                      }}
                      onReturnToQueue={() => handleReturnToQueue(ticket.id)}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Barber Presence Section */}
        <div className="mt-4 sm:mt-6 bg-[rgba(20,20,20,0.9)] border-[3px] border-[rgba(212,175,55,0.3)] rounded-xl p-4 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <h2 className="section-header text-xl sm:text-2xl font-semibold text-white mb-4">Barbeiros Presentes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {barbers.map((barber) => (
              <BarberCard
                key={barber.id}
                barber={barber}
                showPresence
                onClick={async () => {
                  try {
                    await togglePresence(barber.id, !barber.isPresent);
                    await refetchBarbers();
                    await refetchQueue();
                      } catch (error) {
                        let errorMsg = 'Erro ao alterar presença do barbeiro. Tente novamente.';
                        if (error instanceof Error) {
                          errorMsg = error.message;
                        } else if (error && typeof error === 'object' && 'error' in error) {
                          errorMsg = (error as { error: string }).error;
                        }
                        setErrorMessage(errorMsg);
                      }
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Check-in Modal */}
      <Modal
        isOpen={checkInModal.isOpen}
        onClose={checkInModal.close}
        title="Entrar na Fila"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddCustomer();
          }}
          className="space-y-4"
          autoComplete="off"
        >
          <div>
            <label htmlFor="guestName" className="block text-sm font-medium mb-2">
              Nome *
            </label>
            <div className="flex gap-2 flex-nowrap">
              <input
                id="guestName"
                type="text"
                value={checkInName.first}
                onChange={(e) => setCheckInName({ ...checkInName, first: formatName(e.target.value) })}
                placeholder="Primeiro nome"
                autoComplete="one-time-code"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck="false"
                inputMode="text"
                data-lpignore="true"
                data-form-type="other"
                required
                className="max-w-[180px] min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-muted/50 border border-border text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-ring"
                onFocus={(e) => {
                  // Prevent autofill UI by temporarily making readOnly
                  const input = e.target as HTMLInputElement;
                  input.setAttribute('readonly', 'readonly');
                  setTimeout(() => {
                    input.removeAttribute('readonly');
                  }, 100);
                }}
              />
              <input
                id="guestLastName"
                type="text"
                value={checkInName.last}
                onChange={(e) => setCheckInName({ ...checkInName, last: e.target.value.slice(0, 1).toUpperCase() })}
                placeholder="Inicial"
                autoComplete="one-time-code"
                inputMode="text"
                maxLength={1}
                data-lpignore="true"
                data-form-type="other"
                className="w-12 flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-muted/50 border border-border text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-ring"
                onFocus={(e) => {
                  // Prevent autofill UI by temporarily making readOnly
                  const input = e.target as HTMLInputElement;
                  input.setAttribute('readonly', 'readonly');
                  setTimeout(() => {
                    input.removeAttribute('readonly');
                  }, 100);
                }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Barbeiro Preferido (opcional)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreferredBarberId(null)}
                className={cn(
                  'px-3 py-2 rounded-lg border text-sm font-medium transition-all text-center',
                  preferredBarberId === null
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/50'
                )}
              >
                Nenhum
              </button>
              {sortedBarbers.map((barber) => {
                const isSelected = preferredBarberId === barber.id;
                const isAbsent = !barber.isPresent;
                
                return (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => setPreferredBarberId(barber.id)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-sm font-medium transition-all text-center',
                      isSelected
                        ? 'bg-primary/20 border-primary text-primary'
                        : isAbsent
                          ? 'bg-muted/30 border-border/50 text-muted-foreground opacity-60'
                          : 'bg-muted/50 border-border text-foreground hover:border-primary/50'
                    )}
                  >
                    {barber.name}
                    {isAbsent && (
                      <span className="block text-xs text-muted-foreground mt-0.5">Indisponível</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={checkInModal.close} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Barber Selector Modal */}
      {barberSelectorModal.isOpen && selectedCustomerId && (() => {
        const selectedTicket = tickets.find((t) => t.id === selectedCustomerId);
        const preferredBarberId = (selectedTicket && 'preferredBarberId' in selectedTicket) 
          ? ((selectedTicket as { preferredBarberId?: number }).preferredBarberId ?? null)
          : null;
        
        return (
          <BarberSelector
            isOpen={barberSelectorModal.isOpen}
            onClose={barberSelectorModal.close}
            barbers={barbers}
            selectedBarberId={selectedTicket?.barberId || null}
            onSelect={handleSelectBarber}
            customerName={selectedTicket?.customerName}
            tickets={tickets}
            currentTicketId={selectedCustomerId}
            preferredBarberId={preferredBarberId}
          />
        );
      })()}

      {/* Remove Confirmation */}
      <ConfirmationDialog
        isOpen={removeConfirmModal.isOpen}
        onClose={removeConfirmModal.close}
        onConfirm={handleRemoveCustomer}
        title="Remover da Fila"
        message={`Tem certeza que deseja remover ${
          customerToRemove
            ? tickets.find((t) => t.id === customerToRemove)?.customerName
            : 'este cliente'
        } da fila?`}
        confirmText="Remover"
        cancelText="Cancelar"
        variant="destructive"
        icon="delete"
      />

      {/* Complete Confirmation */}
      <ConfirmationDialog
        isOpen={completeConfirmModal.isOpen}
        onClose={completeConfirmModal.close}
        onConfirm={handleCompleteService}
        title="Finalizar Atendimento"
        message={`Tem certeza que deseja finalizar o atendimento de ${
          customerToComplete
            ? tickets.find((t) => t.id === customerToComplete)?.customerName
            : 'este cliente'
        }?`}
        confirmText="Finalizar"
        cancelText="Cancelar"
        icon="check_circle"
      />
    </div>
  );
}
