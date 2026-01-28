import { useMemo } from 'react';
import { Modal } from './Modal';
import { BarberCard } from './BarberCard';
import { Button } from './ui/button';
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
  showAllBarbers?: boolean; // If true, show all barbers (not just present ones)
  preferredBarberId?: number | null; // Preferred barber ID to highlight
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
  showAllBarbers = false,
  preferredBarberId = null,
}: BarberSelectorProps) {
  // Memoize displayed and sorted barbers to avoid recalculation on every render
  const sortedDisplayedBarbers = useMemo(() => {
    // Show all barbers if showAllBarbers is true, otherwise only present barbers
    const displayedBarbers = showAllBarbers ? barbers : barbers.filter((b) => b.isPresent);
    
    // Sort barbers: preferred barber first, then others
    return [...displayedBarbers].sort((a, b) => {
      const aIsPreferred = preferredBarberId !== null && a.id === preferredBarberId;
      const bIsPreferred = preferredBarberId !== null && b.id === preferredBarberId;
      if (aIsPreferred && !bIsPreferred) return -1;
      if (!aIsPreferred && bIsPreferred) return 1;
      return 0;
    });
  }, [barbers, showAllBarbers, preferredBarberId]);

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
      <div className="space-y-4 relative">
        {/* Hidden focus target so the first barber doesn't get auto-focused (and show a focus ring) when the modal opens */}
        <button
          type="button"
          className="sr-only focus:outline-none focus:ring-0"
          aria-hidden="true"
        />
        {preferredBarberId && (
          <div className="text-center py-2 px-4 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm text-primary flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base">star</span>
              Preferência: {barbers.find(b => b.id === preferredBarberId)?.name}
            </p>
          </div>
        )}
        {sortedDisplayedBarbers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {showAllBarbers ? 'Nenhum barbeiro disponível' : 'Nenhum barbeiro presente no momento'}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {sortedDisplayedBarbers.map((barber) => {
              const isBusy = busyBarberIds.has(barber.id);
              const isCurrentlyAssigned = selectedBarberId === barber.id;
              const isAbsent = !barber.isPresent;
              const isPreferred = preferredBarberId !== null && barber.id === preferredBarberId;
              
              return (
                <div key={barber.id} className="relative">
                  {isPreferred && !isCurrentlyAssigned && (
                    <span className="absolute -top-2 -right-2 z-10 material-symbols-outlined text-primary text-xl">star</span>
                  )}
                  <BarberCard
                    barber={barber}
                    isSelected={isCurrentlyAssigned}
                    disabled={isBusy && !isCurrentlyAssigned}
                    disabledReason={isBusy && !isCurrentlyAssigned ? 'Atendendo outro cliente' : isAbsent ? 'Indisponível' : undefined}
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
                </div>
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
              Retornar para a Fila
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
