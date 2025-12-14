import { useMemo } from 'react';
import { Modal } from './Modal';
import { BarberCard } from './BarberCard';
import type { Barber, Ticket } from '@eutonafila/shared';

export interface BarberSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  barbers: Barber[];
  selectedBarberId?: number | null;
  onSelect: (barberId: number | null) => void;
  customerName?: string;
  tickets?: Ticket[];
  currentTicketId?: number | null;
}

export function BarberSelector({
  isOpen,
  onClose,
  barbers,
  selectedBarberId,
  onSelect,
  customerName,
  tickets = [],
  currentTicketId,
}: BarberSelectorProps) {
  // Only show present barbers
  const presentBarbers = barbers.filter((b) => b.isPresent);

  // Calculate which barbers are busy (have an in_progress ticket)
  // Exclude the current ticket being edited (reassignment to same barber is fine)
  const busyBarberIds = useMemo(() => {
    const busyIds = new Set<number>();
    tickets.forEach((ticket) => {
      if (
        ticket.status === 'in_progress' &&
        ticket.barberId &&
        ticket.id !== currentTicketId
      ) {
        busyIds.add(ticket.barberId);
      }
    });
    return busyIds;
  }, [tickets, currentTicketId]);

  const handleSelect = (barberId: number | null) => {
    // Prevent selecting busy barbers
    if (barberId !== null && busyBarberIds.has(barberId)) {
      return;
    }
    onSelect(barberId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerName ? `Atribuir barbeiro para ${customerName}` : 'Selecionar Barbeiro'}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {presentBarbers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum barbeiro presente no momento
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {presentBarbers.map((barber) => {
              const isBusy = busyBarberIds.has(barber.id);
              const isCurrentlyAssigned = selectedBarberId === barber.id;
              
              return (
                <BarberCard
                  key={barber.id}
                  barber={barber}
                  isSelected={isCurrentlyAssigned}
                  disabled={isBusy && !isCurrentlyAssigned}
                  disabledReason={isBusy && !isCurrentlyAssigned ? 'Atendendo outro cliente' : undefined}
                  size="kiosk"
                  onClick={() => {
                    // If clicking the same barber, unassign
                    if (isCurrentlyAssigned) {
                      handleSelect(null);
                    } else if (!isBusy) {
                      handleSelect(barber.id);
                    }
                  }}
                />
              );
            })}
          </div>
        )}

        {selectedBarberId && (
          <div className="pt-4 border-t border-border">
            <button
              onClick={() => handleSelect(null)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Remover atribuição
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
