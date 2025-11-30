import { Modal } from './Modal';
import { BarberCard } from './BarberCard';
import type { Barber } from '@eutonafila/shared';

export interface BarberSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  barbers: Barber[];
  selectedBarberId?: number | null;
  onSelect: (barberId: number | null) => void;
  customerName?: string;
}

export function BarberSelector({
  isOpen,
  onClose,
  barbers,
  selectedBarberId,
  onSelect,
  customerName,
}: BarberSelectorProps) {
  // Only show present barbers
  const presentBarbers = barbers.filter((b) => b.isPresent);

  const handleSelect = (barberId: number | null) => {
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
            {presentBarbers.map((barber) => (
              <BarberCard
                key={barber.id}
                barber={barber}
                isSelected={selectedBarberId === barber.id}
                onClick={() => {
                  // If clicking the same barber, unassign
                  if (selectedBarberId === barber.id) {
                    handleSelect(null);
                  } else {
                    handleSelect(barber.id);
                  }
                }}
              />
            ))}
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
