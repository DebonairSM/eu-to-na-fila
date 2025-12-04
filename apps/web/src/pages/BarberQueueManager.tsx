import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useQueue } from '@/hooks/useQueue';
import { useBarbers } from '@/hooks/useBarbers';
import { useKiosk } from '@/hooks/useKiosk';
import { useModal } from '@/hooks/useModal';
import { useAuthContext } from '@/contexts/AuthContext';
import { Modal } from '@/components/Modal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { BarberSelector } from '@/components/BarberSelector';
import { BarberCard } from '@/components/BarberCard';
import { QueueCard } from '@/components/QueueCard';
import { QRCode } from '@/components/QRCode';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Button } from '@/components/ui/button';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { cn, getErrorMessage } from '@/lib/utils';

const QUEUE_VIEW_DURATION = 15000; // 15 seconds
const AD_VIEW_DURATION = 10000; // 10 seconds

export function BarberQueueManager() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isOwner } = useAuthContext();
  const { data: queueData, isLoading: queueLoading, error: queueError, refetch: refetchQueue } = useQueue(5000); // Poll every 5s
  const { barbers, togglePresence, refetch: refetchBarbers } = useBarbers();
  const {
    isKioskMode,
    currentView,
    isInRotation,
    enterKioskMode,
    exitKioskMode,
    showQueueView,
  } = useKiosk();
  const checkInModal = useModal();
  const barberSelectorModal = useModal();
  const removeConfirmModal = useModal();
  const completeConfirmModal = useModal();
  const { validateName } = useProfanityFilter();

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerToRemove, setCustomerToRemove] = useState<number | null>(null);
  const [customerToComplete, setCustomerToComplete] = useState<number | null>(null);
  const [checkInName, setCheckInName] = useState({ first: '', last: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Enter kiosk mode if ?kiosk=true in URL
  useEffect(() => {
    if (searchParams.get('kiosk') === 'true' && !isKioskMode) {
      enterKioskMode();
    }
  }, [searchParams, isKioskMode, enterKioskMode]);

  const tickets = queueData?.tickets || [];
  const waitingTickets = tickets.filter((t) => t.status === 'waiting');
  const inProgressTickets = tickets.filter((t) => t.status === 'in_progress');
  const sortedTickets = [...inProgressTickets, ...waitingTickets];

  const waitingCount = waitingTickets.length;
  const servingCount = inProgressTickets.length;

  const handleAddCustomer = async () => {
    const validation = validateName(checkInName.first, checkInName.last);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    const fullName = checkInName.last.trim()
      ? `${checkInName.first.trim()} ${checkInName.last.trim()}`
      : checkInName.first.trim();

    setIsSubmitting(true);
    try {
      await api.createTicket(config.slug, {
        customerName: fullName,
        serviceId: 1,
      });
      setCheckInName({ first: '', last: '' });
      checkInModal.close();
      await refetchQueue();
    } catch (error) {
      alert(getErrorMessage(error, 'Erro ao adicionar cliente. Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectBarber = async (barberId: number | null) => {
    if (!selectedCustomerId) return;

    try {
      if (barberId === null) {
        // Unassign
        await api.updateTicket(selectedCustomerId, {
          barberId: null,
          status: 'waiting',
        });
      } else {
        // Assign barber
        await api.updateTicket(selectedCustomerId, {
          barberId,
          status: 'in_progress',
        });
      }
      await refetchQueue();
      barberSelectorModal.close();
      setSelectedCustomerId(null);
    } catch (error) {
      alert(getErrorMessage(error, 'Erro ao atribuir barbeiro. Tente novamente.'));
    }
  };

  const handleRemoveCustomer = async () => {
    if (!customerToRemove) return;

    try {
      await api.cancelTicketAsStaff(customerToRemove);
      await refetchQueue();
      removeConfirmModal.close();
      setCustomerToRemove(null);
    } catch (error) {
      alert(getErrorMessage(error, 'Erro ao remover cliente. Tente novamente.'));
    }
  };

  const handleCompleteService = async () => {
    if (!customerToComplete) return;

    try {
      await api.updateTicket(customerToComplete, {
        status: 'completed',
      });
      await refetchQueue();
      completeConfirmModal.close();
      setCustomerToComplete(null);
    } catch (error) {
      alert(getErrorMessage(error, 'Erro ao finalizar atendimento. Tente novamente.'));
    }
  };

  const getAssignedBarber = (ticket: any) => {
    if (!ticket.barberId) return null;
    return barbers.find((b) => b.id === ticket.barberId) || null;
  };

  // Kiosk Mode View
  if (isKioskMode) {
    const joinUrl = `${window.location.origin}/mineiro/join`;

    return (
      <div className="fixed inset-0 bg-black text-white z-50 overflow-hidden flex flex-col">
        {/* Exit Button - Subtle in corner */}
        <button
          onClick={exitKioskMode}
          className="absolute top-6 left-6 z-50 w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
          aria-label="Exit kiosk mode"
        >
          <span className="material-symbols-outlined text-white/50 text-2xl">settings</span>
        </button>

        {/* QR Code - Top right */}
        <div className="absolute top-6 right-6 z-50 bg-white p-2 rounded-xl shadow-2xl">
          <QRCode url={joinUrl} size={100} />
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
                  sortedTickets.map((ticket) => {
                    const assignedBarber = getAssignedBarber(ticket);
                    const isServing = ticket.status === 'in_progress';

                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        className={cn(
                          'w-full px-8 py-6 rounded-2xl border transition-all text-left',
                          'hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
                          {
                            'bg-[#10B981]/15 border-[#10B981]/50': isServing,
                            'bg-[rgba(20,20,20,0.8)] border-[rgba(212,175,55,0.2)] hover:border-[rgba(212,175,55,0.4)]': !isServing,
                          }
                        )}
                        onClick={() => {
                          setSelectedCustomerId(ticket.id);
                          barberSelectorModal.open();
                          showQueueView();
                        }}
                        aria-label={`${ticket.customerName}, posição ${ticket.position}${assignedBarber ? `, atendido por ${assignedBarber.name}` : ''}`}
                      >
                        <div className="flex items-center gap-6">
                          {/* Position Badge */}
                          <div
                            className={cn(
                              'w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0',
                              {
                                'bg-[#10B981] text-white': isServing,
                                'bg-[#D4AF37] text-black': !isServing,
                              }
                            )}
                          >
                            {isServing ? (
                              <span className="material-symbols-outlined text-3xl">check</span>
                            ) : (
                              ticket.position
                            )}
                          </div>
                          {/* Customer Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-2xl text-white truncate">{ticket.customerName}</p>
                            {assignedBarber && (
                              <p className="text-lg text-white/60 mt-1 truncate flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">content_cut</span>
                                {assignedBarber.name}
                              </p>
                            )}
                          </div>
                          {/* Status indicator */}
                          {isServing && (
                            <div className="flex-shrink-0 px-4 py-2 bg-[#10B981]/20 rounded-xl">
                              <span className="text-[#10B981] text-sm font-medium uppercase tracking-wider">Atendendo</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Bar - Barber Presence */}
            <footer className="flex-shrink-0 py-6 px-8 border-t border-[rgba(212,175,55,0.15)] bg-[rgba(10,10,10,0.95)]">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {barbers.map((barber) => (
                    <button
                      key={barber.id}
                      onClick={async () => {
                        try {
                          await togglePresence(barber.id, !barber.isPresent);
                          await refetchBarbers();
                          await refetchQueue();
                        } catch (error) {
                          alert(getErrorMessage(error, 'Erro ao alterar presença do barbeiro. Tente novamente.'));
                        }
                      }}
                      className={cn(
                        'px-6 py-3 rounded-xl border-2 font-medium transition-all text-lg',
                        barber.isPresent
                          ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                          : 'bg-white/5 border-white/20 text-white/40'
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
        {(currentView === 'ad1' || currentView === 'ad2' || currentView === 'ad3') && (
          <button
            type="button"
            className="flex-1 flex items-center justify-center p-8 cursor-pointer relative"
            onClick={showQueueView}
            aria-label="Voltar para visualização da fila"
          >
            <div className="text-center space-y-8 max-w-4xl">
              <h2 className="text-6xl font-bold">Anúncio {currentView.slice(-1)}</h2>
              <p className="text-2xl text-white/70">
                {currentView === 'ad1' && 'Promoções especiais'}
                {currentView === 'ad2' && 'Horários de funcionamento'}
                {currentView === 'ad3' && 'Produtos disponíveis'}
              </p>
              <p className="text-xl text-white/50">Toque para voltar à fila</p>
            </div>
            <div className="absolute bottom-8 right-8 bg-white p-3 rounded-xl">
              <QRCode url={joinUrl} size={120} />
            </div>
          </button>
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
      </div>
    );
  }

  // Management Mode View
  return (
    <div className="min-h-screen bg-black p-3 sm:p-4 pb-20">
      <div className="container max-w-[600px] mx-auto">
        {/* Header */}
        <div className="header bg-[rgba(20,20,20,0.9)] border-[3px] border-[rgba(212,175,55,0.3)] rounded-xl p-4 sm:p-6 mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(isOwner ? '/owner' : '/staff')}
                className="icon-button w-12 h-12 rounded-lg border-[3px] border-[rgba(212,175,55,0.3)] bg-[rgba(20,20,20,0.8)] text-[rgba(255,255,255,0.8)] flex items-center justify-center transition-all hover:border-[#D4AF37] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)] hover:translate-x-0.5 hover:shadow-[0_4px_16px_rgba(212,175,55,0.2)]"
                aria-label="Back"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
              <div className="header-title">
                <h1 className="text-lg sm:text-2xl font-semibold text-white flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl sm:text-2xl text-[#D4AF37]">content_cut</span>
                  <span className="hidden sm:inline">{config.name}</span>
                </h1>
              </div>
            </div>
            <button
              onClick={enterKioskMode}
              className="icon-button w-12 h-12 rounded-lg border-[3px] border-[rgba(212,175,55,0.3)] bg-[rgba(20,20,20,0.8)] text-[rgba(255,255,255,0.8)] flex items-center justify-center transition-all hover:border-[#D4AF37] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)] hover:translate-x-0.5 hover:shadow-[0_4px_16px_rgba(212,175,55,0.2)]"
              aria-label="Enter kiosk mode"
            >
              <span className="material-symbols-outlined text-xl">tv</span>
            </button>
          </div>
          <div className="stats flex gap-4 sm:gap-6 pt-4 border-t border-[rgba(0,0,0,0.06)]">
            <div className="stat-item flex-1 text-center">
              <div className="stat-value text-2xl sm:text-3xl font-semibold text-[#D4AF37]">{waitingCount}</div>
              <div className="stat-label text-xs text-[rgba(255,255,255,0.7)] mt-1">Aguardando</div>
            </div>
            <div className="stat-item flex-1 text-center">
              <div className="stat-value text-2xl sm:text-3xl font-semibold text-[#22c55e]">{servingCount}</div>
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
          <div className="section-header text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Fila</div>
          {queueLoading ? (
            <LoadingSpinner size="lg" text="Carregando fila..." />
          ) : queueError ? (
            <ErrorDisplay error={queueError} onRetry={refetchQueue} />
          ) : (
            <div className="space-y-3">
              {sortedTickets.length === 0 ? (
                <div className="text-center py-12 text-[rgba(255,255,255,0.7)]">
                  Nenhum cliente na fila
                </div>
              ) : (
                sortedTickets.map((ticket) => {
                  const assignedBarber = getAssignedBarber(ticket);
                  return (
                    <QueueCard
                      key={ticket.id}
                      ticket={ticket}
                      assignedBarber={assignedBarber}
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
                    if (error instanceof Error) {
                      alert(error.message);
                    } else if (error && typeof error === 'object' && 'error' in error) {
                      alert((error as { error: string }).error);
                    } else {
                      alert('Erro ao alterar presença do barbeiro. Tente novamente.');
                    }
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
        >
          <div>
            <label htmlFor="checkInFirst" className="block text-sm font-medium mb-2">
              Nome *
            </label>
            <input
              id="checkInFirst"
              type="text"
              value={checkInName.first}
              onChange={(e) => setCheckInName({ ...checkInName, first: e.target.value })}
              placeholder="Primeiro nome"
              required
              className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="checkInLast" className="block text-sm font-medium mb-2">
              Sobrenome (opcional)
            </label>
            <input
              id="checkInLast"
              type="text"
              value={checkInName.last}
              onChange={(e) => setCheckInName({ ...checkInName, last: e.target.value })}
              placeholder="Sobrenome"
              className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
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
      <BarberSelector
        isOpen={barberSelectorModal.isOpen}
        onClose={barberSelectorModal.close}
        barbers={barbers}
        selectedBarberId={
          selectedCustomerId
            ? tickets.find((t) => t.id === selectedCustomerId)?.barberId || null
            : null
        }
        onSelect={handleSelectBarber}
        customerName={
          selectedCustomerId
            ? tickets.find((t) => t.id === selectedCustomerId)?.customerName
            : undefined
        }
      />

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
