import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Button, Stack } from '@/components/design-system';
import { useLocale } from '@/contexts/LocaleContext';

interface ActionButtonsProps {
  status: 'pending' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  ticketId: number;
  canCancel: boolean;
  onLeaveQueue: (ticketId: number) => Promise<void>;
  isLeaving: boolean;
  leaveError?: string | null;
  onDismissLeaveError?: () => void;
  onShare?: () => void;
}

export function ActionButtons({
  status,
  ticketId,
  canCancel,
  onLeaveQueue,
  isLeaving,
  leaveError,
  onDismissLeaveError,
  onShare,
}: ActionButtonsProps) {
  const { t } = useLocale();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
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
        {leaveError && (
          <div className="p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#ef4444] text-xl flex-shrink-0">error</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#ef4444]">{leaveError}</p>
              {onDismissLeaveError && (
                <button
                  type="button"
                  onClick={onDismissLeaveError}
                  className="mt-2 text-xs text-[#ef4444]/80 hover:text-[#ef4444] underline"
                >
                  {t('status.close')}
                </button>
              )}
            </div>
          </div>
        )}
        {canCancel && (
          <>
            <div className="lg:hidden fixed bottom-6 right-6 z-50">
              <button
                className="w-14 h-14 rounded-full bg-[#ef4444] text-white shadow-lg hover:bg-[#dc2626] transition-all flex items-center justify-center min-h-[56px] min-w-[56px]"
                onClick={handleLeaveClick}
                disabled={isLeaving}
                aria-label={t('status.leaveQueueAria')}
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
                    {t('status.leaving')}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">exit_to_app</span>
                    {t('status.leaveQueue')}
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
              {t('status.backHomeButton')}
            </Button>
          </Link>
        )}

        {onShare && (
          <Button variant="outline" fullWidth onClick={onShare}>
            <span className="material-symbols-outlined text-xl">share</span>
            {t('status.shareTicket')}
          </Button>
        )}
      </Stack>

      <ConfirmationDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleConfirmLeave}
        title={t('status.confirmLeaveTitle')}
        message={t('status.confirmLeaveMessage')}
        confirmText={t('status.confirmLeaveConfirm')}
        cancelText={t('status.confirmLeaveCancel')}
        variant="destructive"
        icon="exit_to_app"
      />
    </>
  );
}
