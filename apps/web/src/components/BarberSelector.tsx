import { useMemo } from 'react';
import { Modal } from './Modal';
import { BarberCard } from './BarberCard';
import { ClipNotesPanel } from './ClipNotesPanel';
import { Button } from './ui/button';
import { useLocale } from '@/contexts/LocaleContext';
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
  /** Customer's preferred barber id (for preference messaging). */
  preferredBarberId?: number | null;
  /** Resolved name of preferred barber. */
  preferredBarberName?: string | null;
  /** When in exclusive barber login, the logged-in barber's id (for "prefers you" vs "different barber"). */
  currentBarberId?: number | null;
  /** When set, show clip notes for this client above the barber grid. */
  clientId?: number | null;
  /** Shop slug for fetching clip notes. Required when clientId is set. */
  shopSlug?: string;
  /** Callback when clip notes panel reports an error. */
  onClipNotesError?: (msg: string) => void;
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
  preferredBarberName = null,
  currentBarberId = null,
  clientId = null,
  shopSlug,
  onClipNotesError,
}: BarberSelectorProps) {
  const { t } = useLocale();
  const sortedDisplayedBarbers = useMemo(() => {
    const displayedBarbers = showAllBarbers ? barbers : barbers.filter((b) => b.isPresent);
    return [...displayedBarbers];
  }, [barbers, showAllBarbers]);

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
        {clientId != null && shopSlug && (
          <ClipNotesPanel
            shopSlug={shopSlug}
            clientId={clientId}
            onError={onClipNotesError}
          />
        )}
        {/* Hidden focus target so the first barber doesn't get auto-focused (and show a focus ring) when the modal opens */}
        <button
          type="button"
          className="sr-only focus:outline-none focus:ring-0"
          aria-hidden="true"
        />
        {preferredBarberId != null && (
          <p className="text-sm text-[var(--shop-text-secondary)]">
            {currentBarberId != null
              ? preferredBarberId === currentBarberId
                ? t('barber.preferredByCustomer')
                : t('barber.prefersDifferentBarber')
              : preferredBarberName
                ? `${t('barber.customerPrefers')} ${preferredBarberName}.`
                : t('barber.prefersDifferentBarber')}
          </p>
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

              return (
                <div key={barber.id} className="relative">
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
