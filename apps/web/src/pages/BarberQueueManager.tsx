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
import { Button } from '@/components/ui/button';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { cn } from '@/lib/utils';

const QUEUE_VIEW_DURATION = 15000; // 15 seconds
const AD_VIEW_DURATION = 10000; // 10 seconds

export function BarberQueueManager() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isOwner } = useAuthContext();
  const { data: queueData, refetch: refetchQueue } = useQueue(5000); // Poll every 5s
  const { barbers, togglePresence } = useBarbers();
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
      console.error('Error adding customer:', error);
      alert('Erro ao adicionar cliente. Tente novamente.');
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
      console.error('Error assigning barber:', error);
      alert('Erro ao atribuir barbeiro. Tente novamente.');
    }
  };

  const handleRemoveCustomer = async () => {
    if (!customerToRemove) return;

    try {
      await api.cancelTicket(customerToRemove);
      await refetchQueue();
      removeConfirmModal.close();
      setCustomerToRemove(null);
    } catch (error) {
      console.error('Error removing customer:', error);
      alert('Erro ao remover cliente. Tente novamente.');
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
      console.error('Error completing service:', error);
      alert('Erro ao finalizar atendimento. Tente novamente.');
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
      <div className="fixed inset-0 bg-black text-white z-50 overflow-hidden">
        {/* Exit Button */}
        <button
          onClick={exitKioskMode}
          className="absolute top-4 left-4 z-50 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Exit kiosk mode"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>

        {/* QR Code */}
        <div className="absolute top-4 right-4 z-50">
          <QRCode url={joinUrl} size={80} />
        </div>

        {/* Content */}
        {currentView === 'queue' && (
          <div className="h-full flex flex-col p-8">
            {/* Queue List */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {sortedTickets.map((ticket) => {
                const assignedBarber = getAssignedBarber(ticket);
                const isServing = ticket.status === 'in_progress';

                return (
                  <div
                    key={ticket.id}
                    className={cn(
                      'p-6 rounded-lg border-2 text-2xl',
                      {
                        'bg-green-500/20 border-green-500': isServing,
                        'bg-white/5 border-white/20': !isServing,
                      }
                    )}
                    onClick={() => {
                      setSelectedCustomerId(ticket.id);
                      barberSelectorModal.open();
                      showQueueView();
                    }}
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={cn(
                          'w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl',
                          {
                            'bg-green-500': isServing,
                            'bg-primary': !isServing,
                          }
                        )}
                      >
                        {isServing ? (
                          <span className="material-symbols-outlined text-white">check</span>
                        ) : (
                          ticket.position
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{ticket.customerName}</p>
                        {assignedBarber && (
                          <p className="text-lg text-white/70">{assignedBarber.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Barber Presence Selector */}
            <div className="mt-8 pt-8 border-t border-white/20">
              <div className="flex gap-4 justify-center flex-wrap">
                {barbers.map((barber) => (
                  <button
                    key={barber.id}
                    onClick={async () => {
                      await togglePresence(barber.id, !barber.isPresent);
                      await refetchQueue();
                    }}
                    className={cn(
                      'px-4 py-2 rounded-lg border-2 transition-colors',
                      barber.isPresent
                        ? 'bg-green-500/20 border-green-500'
                        : 'bg-white/5 border-white/20 opacity-50'
                    )}
                  >
                    {barber.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Check-in Button */}
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  checkInModal.open();
                  showQueueView();
                }}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-bold text-xl hover:bg-primary/90 transition-colors"
              >
                {config.name}
              </button>
            </div>
          </div>
        )}

        {/* Ad Views */}
        {(currentView === 'ad1' || currentView === 'ad2' || currentView === 'ad3') && (
          <div
            className="h-full flex items-center justify-center p-8 cursor-pointer relative"
            onClick={showQueueView}
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
            <div className="absolute bottom-4 right-4">
              <QRCode url={joinUrl} size={100} />
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isInRotation && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-primary"
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(isOwner ? '/owner' : '/staff')}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">content_cut</span>
                {config.name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Aguardando</p>
              <p className="text-2xl font-bold">{waitingCount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Atendendo</p>
              <p className="text-2xl font-bold text-green-500">{servingCount}</p>
            </div>
            <button
              onClick={enterKioskMode}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Enter kiosk mode"
            >
              <span className="material-symbols-outlined">tv</span>
            </button>
          </div>
        </div>

        {/* Add Customer Button */}
        <div className="mb-6">
          <Button onClick={checkInModal.open} size="lg">
            <span className="material-symbols-outlined">person_add</span>
            Adicionar Cliente
          </Button>
        </div>

        {/* Queue List */}
        {queueData ? (
          <div className="space-y-3">
            {sortedTickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
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
        ) : (
          <LoadingSpinner size="lg" />
        )}

        {/* Barber Presence Section */}
        <div className="mt-8 pt-8 border-t border-border">
          <h2 className="text-xl font-semibold mb-4">Barbeiros Presentes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {barbers.map((barber) => (
              <BarberCard
                key={barber.id}
                barber={barber}
                showPresence
                onClick={async () => {
                  await togglePresence(barber.id, !barber.isPresent);
                  await refetchQueue();
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
