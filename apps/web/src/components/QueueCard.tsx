import { useState, memo } from 'react';
import { cn, formatNameForDisplay } from '@/lib/utils';
import { getBarberAvatarUrl } from '@/lib/avatar';
import type { Ticket, Barber } from '@eutonafila/shared';

export interface QueueCardProps {
  ticket: Ticket;
  assignedBarber?: Barber | null;
  barbers?: Barber[];
  displayPosition?: number | null;
  onClick?: () => void;
  onRemove?: () => void;
  onComplete?: () => void;
  /** When true, card is dimmed and onClick is no-op (e.g. appointment not yet selectable) */
  disabled?: boolean;
  /** Shown as tooltip when disabled */
  disabledReason?: string;
  className?: string;
}

export const QueueCard = memo(function QueueCard({
  ticket,
  assignedBarber,
  displayPosition,
  onClick,
  onRemove,
  onComplete,
  disabled = false,
  disabledReason,
  className,
}: QueueCardProps) {
  const [barberAvatarFailed, setBarberAvatarFailed] = useState(false);
  const [barberImageLoaded, setBarberImageLoaded] = useState(false);
  const isServing = ticket.status === 'in_progress';
  const isWaiting = ticket.status === 'waiting';

  const barberAvatarUrl = assignedBarber ? getBarberAvatarUrl(assignedBarber, 64) : null;
  const barberInitials = assignedBarber?.name?.charAt(0)?.toUpperCase() || '';
  const showAvatarImage = barberAvatarUrl && !barberAvatarFailed;

  return (
    <div
      className={cn(
        'queue-item p-6 rounded-md border-2 transition-all',
        'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-accent)] focus-visible:ring-offset-2',
        {
          'border-[var(--shop-accent)] bg-[var(--shop-background)] hover:border-[var(--shop-accent)] hover:bg-[var(--shop-background)]': isServing,
          'border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] bg-card hover:border-[var(--shop-accent)] hover:bg-[color-mix(in_srgb,var(--shop-accent)_5%,transparent)]': isWaiting && !disabled,
          'opacity-60 cursor-not-allowed': disabled,
          'cursor-pointer': !disabled && onClick,
        },
        className
      )}
      onClick={disabled ? undefined : onClick}
      role={!disabled && onClick ? 'button' : undefined}
      tabIndex={!disabled && onClick ? 0 : undefined}
      onKeyDown={!disabled && onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={!disabled && onClick ? `Cliente ${ticket.customerName}, posição ${displayPosition !== null && displayPosition !== undefined ? displayPosition : ticket.position}${assignedBarber ? `, atendido por ${assignedBarber.name}` : ''}` : undefined}
      title={disabled && disabledReason ? disabledReason : undefined}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Position Badge / Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Position Badge or Complete button - 52px × 52px for management mode */}
            <button
              type="button"
              className={cn(
                'flex-shrink-0 w-[52px] h-[52px] rounded-md flex items-center justify-center font-bold text-lg cursor-pointer transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-0',
                isWaiting && 'bg-[var(--shop-background)] text-[var(--shop-accent)] border-2 border-[var(--shop-accent)] hover:text-[var(--shop-accent-hover)] hover:border-[var(--shop-accent-hover)]',
                isServing && 'bg-[var(--shop-background)] text-[var(--shop-accent)] border-2 border-[var(--shop-accent)] hover:text-[var(--shop-accent-hover)] hover:border-[var(--shop-accent-hover)]'
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (isServing && onComplete) {
                  onComplete();
                } else if (isWaiting && onRemove) {
                  onRemove();
                }
              }}
              aria-label={
                isServing
                  ? `Finalizar atendimento de ${ticket.customerName}`
                  : `Remover ${ticket.customerName} da fila`
              }
            >
              {isServing ? (
                <span className="material-symbols-outlined text-2xl" aria-hidden="true">check</span>
              ) : (
                <span aria-hidden="true">{displayPosition !== null && displayPosition !== undefined ? displayPosition : ticket.position}</span>
              )}
            </button>
            {/* Remove/cancel button - shown for in_progress clients to cancel the service */}
            {isServing && onRemove && (
              <button
                type="button"
                className="flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center text-red-400/90 hover:text-red-400 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                aria-label={`Remover ${ticket.customerName} da fila e cancelar atendimento`}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
              </button>
            )}
          </div>

          {/* Customer Name + ticket number / type (hybrid mode) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-[var(--shop-text-primary)] truncate">{formatNameForDisplay(ticket.customerName)}</p>
              {(ticket as { ticketNumber?: string | null }).ticketNumber && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/10 text-[var(--shop-text-secondary)]">
                  {(ticket as { ticketNumber?: string | null }).ticketNumber}
                </span>
              )}
              {(ticket as { type?: string }).type === 'appointment' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--shop-accent)]/20 text-[var(--shop-accent)] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">event</span>
                  Agendado
                </span>
              )}
            </div>
            {assignedBarber && (
              <p className="text-sm text-[var(--shop-text-secondary)] truncate">{assignedBarber.name}</p>
            )}
          </div>
        </div>

        {/* Barber Avatar - 40px × 40px for management mode */}
        {(barberAvatarUrl || assignedBarber) && (
          <div className="flex-shrink-0 w-10 h-10 relative">
            {/* Always show placeholder immediately for better perceived performance */}
            <div className={cn(
              'rounded-md bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] text-[var(--shop-text-on-accent)] font-semibold flex items-center justify-center absolute inset-0 transition-opacity duration-200',
              barberImageLoaded && 'opacity-0 pointer-events-none'
            )} aria-hidden="true">
              {barberInitials}
            </div>
            {showAvatarImage && barberAvatarUrl && (
              <img
                src={barberAvatarUrl}
                alt={assignedBarber?.name || 'Barber'}
                className="w-10 h-10 rounded-md object-cover relative z-10"
                loading="lazy"
                decoding="async"
                width={40}
                height={40}
                onLoad={() => {
                  setBarberImageLoaded(true);
                }}
                onError={(e) => {
                  // Silently fall back to initials on any error (CSP violation, rate limit, network error, etc.)
                  setBarberAvatarFailed(true);
                  // Prevent error from bubbling
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
});
