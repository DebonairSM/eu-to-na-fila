import { Modal } from './Modal';
import { useLocale } from '@/contexts/LocaleContext';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  icon?: string;
}

const modalPanelClass =
  'max-w-sm bg-[var(--shop-surface-secondary)] border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] [--radius-xl:var(--radius-xl)]';
const titleClass = 'text-[var(--shop-text-primary)]';
const messageClass = 'text-center text-[var(--shop-text-secondary)]';
const iconClass = 'text-[var(--shop-accent)]';
const cancelButtonClass =
  'inline-flex items-center justify-center gap-3 rounded-md font-medium transition-colors min-h-10 px-4 py-2 border border-[var(--shop-border-color)] bg-transparent text-[var(--shop-text-primary)] hover:bg-[rgba(255,255,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--shop-surface-secondary)] disabled:opacity-50';
const confirmButtonClass =
  'inline-flex items-center justify-center gap-3 rounded-md font-medium transition-colors min-h-10 px-4 py-2 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] hover:bg-[var(--shop-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--shop-surface-secondary)] disabled:opacity-50';
const destructiveButtonClass =
  'inline-flex items-center justify-center gap-3 rounded-md font-medium transition-colors min-h-10 px-4 py-2 bg-[#dc2626] text-white hover:bg-[#b91c1c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--shop-surface-secondary)] disabled:opacity-50';

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'default',
  icon,
}: ConfirmationDialogProps) {
  const { t } = useLocale();
  const confirmLabel = confirmText ?? t('common.confirm');
  const cancelLabel = cancelText ?? t('common.cancel');
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      titleClassName={titleClass}
      className={modalPanelClass}
    >
      <div className="space-y-4">
        {icon && (
          <div className="flex justify-center mb-4">
            <span className={`material-symbols-outlined text-3xl ${iconClass}`}>
              {icon}
            </span>
          </div>
        )}

        {message && <p className={messageClass}>{message}</p>}

        <div className="flex gap-3 justify-end">
          <button type="button" className={cancelButtonClass} onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={variant === 'destructive' ? destructiveButtonClass : confirmButtonClass}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
