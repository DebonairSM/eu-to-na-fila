import { Modal } from './Modal';
import { Button } from './ui/button';
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
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-sm">
      <div className="space-y-4">
        {icon && (
          <div className="flex justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-muted-foreground">
              {icon}
            </span>
          </div>
        )}

        {message && <p className="text-center text-muted-foreground">{message}</p>}

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={variant === 'destructive' ? 'destructive' : 'default'}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
