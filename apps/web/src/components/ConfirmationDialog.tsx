import { Modal } from './Modal';
import { Button } from './ui/button';

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
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  icon,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-sm">
      <div className="space-y-4">
        {icon && (
          <div className="flex justify-center">
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              {icon}
            </span>
          </div>
        )}

        {message && <p className="text-center text-muted-foreground">{message}</p>}

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={variant === 'destructive' ? 'destructive' : 'default'}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
