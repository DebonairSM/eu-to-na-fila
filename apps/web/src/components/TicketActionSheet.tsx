import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '@/contexts/LocaleContext';
import { formatNameForDisplay } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Barber } from '@eutonafila/shared';

export interface TicketActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  serviceName?: string | null;
  displayPosition?: number | null;
  assignedBarber?: Barber | null;
  isServing: boolean;
  onAssignBarber: () => void;
  onNotes?: () => void;
  onComplete?: () => void;
  onRemove: () => void;
  showNotesButton: boolean;
}

export function TicketActionSheet({
  isOpen,
  onClose,
  customerName,
  serviceName,
  displayPosition,
  assignedBarber,
  isServing,
  onAssignBarber,
  onNotes,
  onComplete,
  onRemove,
  showNotesButton,
}: TicketActionSheetProps) {
  const { t } = useLocale();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[99999] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t('barber.clipNotes')}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="relative z-10 bg-[var(--shop-surface-secondary)] border-2 border-t-[var(--shop-border-color)] border-x-0 border-b-0 rounded-t-2xl shadow-xl max-h-[85vh] max-h-[85dvh] overflow-y-auto"
      >
        <div className="p-4 pb-safe">
          <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-4" aria-hidden="true" />
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--shop-text-primary)]">
              {formatNameForDisplay(customerName)}
            </h2>
            {serviceName && (
              <p className="text-sm text-[var(--shop-text-secondary)] flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-sm">design_services</span>
                {serviceName}
              </p>
            )}
            {(displayPosition != null || assignedBarber) && (
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-[var(--shop-text-secondary)]">
                {displayPosition != null && !isServing && (
                  <span>#{displayPosition}</span>
                )}
                {assignedBarber && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">content_cut</span>
                    {assignedBarber.name}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => onAssignBarber()}
              type="button"
            >
              <span className="material-symbols-outlined">person</span>
              {assignedBarber ? t('barber.editBarber') : t('barber.assignBarber')}
            </Button>
            {showNotesButton && onNotes && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => onNotes()}
                type="button"
              >
                <span className="material-symbols-outlined">note</span>
                {t('barber.seePreviousNotes')}
              </Button>
            )}
            {isServing && onComplete && (
              <Button
                className="w-full justify-start gap-2 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] hover:opacity-90"
                onClick={() => onComplete?.()}
                type="button"
              >
                <span className="material-symbols-outlined">check</span>
                {t('barber.completeButton')}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-red-400 border-red-500/30 hover:bg-red-500/20 hover:text-red-400"
              onClick={() => onRemove()}
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
              {isServing ? t('barber.removeButton') : t('barber.removeButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content;
}
