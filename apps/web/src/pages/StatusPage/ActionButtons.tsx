import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

interface ActionButtonsProps {
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  ticketId: number;
  onLeaveQueue: (ticketId: number) => Promise<void>;
  isLeaving: boolean;
  onShare?: () => void;
}

export function ActionButtons({ status, ticketId, onLeaveQueue, isLeaving, onShare }: ActionButtonsProps) {
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
      // Error handling is done in the hook
      setShowLeaveConfirm(false);
    }
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-5">
        {isWaiting && (
          <>
            {/* Mobile: FAB will be rendered separately */}
            <div className="lg:hidden fixed bottom-6 right-6 z-50">
              <button
                className="w-14 h-14 rounded-full bg-[#ef4444] text-white shadow-lg hover:bg-[#dc2626] transition-all flex items-center justify-center min-h-[56px] min-w-[56px]"
                onClick={handleLeaveClick}
                disabled={isLeaving}
                aria-label="Sair da Fila"
              >
                {isLeaving ? (
                  <span className="material-symbols-outlined animate-spin text-2xl">hourglass_top</span>
                ) : (
                  <span className="material-symbols-outlined text-2xl">exit_to_app</span>
                )}
              </button>
            </div>

            {/* Desktop: Inline button */}
            <div className="hidden lg:block">
              <button
                className="w-full px-6 py-4 bg-[#ef4444] text-white font-semibold rounded-lg flex items-center justify-center gap-3 hover:bg-[#dc2626] transition-all disabled:opacity-50 min-h-[52px]"
                onClick={handleLeaveClick}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
                    Saindo...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">exit_to_app</span>
                    Sair da Fila
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {isCompleted && (
          <Link to="/mineiro/home">
            <button className="w-full px-6 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg flex items-center justify-center gap-3 hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all min-h-[52px]">
              <span className="material-symbols-outlined text-xl">home</span>
              Voltar ao Início
            </button>
          </Link>
        )}

        {/* Share button */}
        {onShare && (
          <button
            onClick={onShare}
            className="w-full px-6 py-3 bg-transparent text-[rgba(255,255,255,0.7)] border-2 border-[rgba(255,255,255,0.3)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all min-h-[52px] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">share</span>
            Compartilhar Link
          </button>
        )}

        <Link to="/mineiro/home">
          <button className="w-full px-6 py-3 bg-transparent text-[rgba(255,255,255,0.7)] border-2 border-[rgba(255,255,255,0.3)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all min-h-[52px] flex items-center justify-center">
            Voltar
          </button>
        </Link>
      </div>

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
