import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Button, Stack } from '@/components/design-system';

interface ActionButtonsProps {
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  ticketId: number;
  onLeaveQueue: (ticketId: number) => Promise<void>;
  isLeaving: boolean;
  onShare?: () => void;
}

export function ActionButtons({
  status,
  ticketId,
  onLeaveQueue,
  isLeaving,
  onShare,
}: ActionButtonsProps) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const isWaiting = status === 'waiting';
  const isCompleted = status === 'completed';

  const handleLeaveClick = () => {
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = async () => {
    try {
      await onLeaveQueue(ticketId);
      setShowLeaveConfirm(false);
    } catch (error) {
      setShowLeaveConfirm(false);
    }
  };

  return (
    <>
      <Stack spacing="md">
        {isWaiting && (
          <>
            {/* Mobile: FAB */}
            <div className="lg:hidden fixed bottom-6 right-6 z-50">
              <button
                className="w-14 h-14 rounded-full bg-[#ef4444] text-white shadow-lg hover:bg-[#dc2626] transition-all flex items-center justify-center min-h-[56px] min-w-[56px]"
                onClick={handleLeaveClick}
                disabled={isLeaving}
                aria-label="Sair da Fila"
              >
                {isLeaving ? (
                  <span className="material-symbols-outlined animate-spin text-2xl">
                    hourglass_top
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-2xl">exit_to_app</span>
                )}
              </button>
            </div>

            {/* Desktop: Inline button */}
            <div className="hidden lg:block">
              <Button
                variant="destructive"
                size="lg"
                fullWidth
                onClick={handleLeaveClick}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">
                      hourglass_top
                    </span>
                    Saindo...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">exit_to_app</span>
                    Sair da Fila
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {isCompleted && (
          <Link to="/home">
            <Button size="lg" fullWidth>
              <span className="material-symbols-outlined text-xl">home</span>
              Voltar ao Início
            </Button>
          </Link>
        )}

        {/* Share button */}
        {onShare && (
          <Button variant="outline" fullWidth onClick={onShare}>
            <span className="material-symbols-outlined text-xl">share</span>
            Compartilhar Link
          </Button>
        )}

        <Link to="/home">
          <Button variant="ghost" fullWidth>
            Voltar
          </Button>
        </Link>
      </Stack>

      <ConfirmationDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleConfirmLeave}
        title="Sair da Fila?"
        message="Tem certeza que deseja sair da fila? Você perderá sua posição."
        confirmText="Sair"
        cancelText="Cancelar"
        variant="destructive"
        icon="exit_to_app"
      />
    </>
  );
}
