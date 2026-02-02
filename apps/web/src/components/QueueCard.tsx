import { useState, memo } from 'react';
import { cn, formatNameForDisplay } from '@/lib/utils';
import { getBarberAvatarUrl } from '@/lib/avatar';
import type { Ticket, Barber } from '@eutonafila/shared';

export interface QueueCardProps {
  ticket: Ticket;
  assignedBarber?: Barber | null;
  barbers?: Barber[]; // For displaying preferred barber
  displayPosition?: number | null; // Display position (calculated from sorted order)
  onClick?: () => void;
  onRemove?: () => void;
  onComplete?: () => void;
  className?: string;
}

export const QueueCard = memo(function QueueCard({
  ticket,
  assignedBarber,
  displayPosition,
  onClick,
  onRemove,
  onComplete,
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
        'queue-item p-6 rounded-md border-2 transition-all cursor-pointer',
        'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2',
        {
          'border-[#D4AF37] bg-black hover:border-[#D4AF37] hover:bg-black/90': isServing,
          'border-primary/30 bg-card hover:border-primary hover:bg-primary/5': isWaiting,
        },
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={onClick ? `Cliente ${ticket.customerName}, posição ${displayPosition !== null && displayPosition !== undefined ? displayPosition : ticket.position}${assignedBarber ? `, atendido por ${assignedBarber.name}` : ''}` : undefined}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Position Badge / Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Position Badge or Complete button - 52px × 52px for management mode */}
            <button
              type="button"
              className={cn(
                'flex-shrink-0 w-[52px] h-[52px] rounded-md flex items-center justify-center font-bold text-lg cursor-pointer transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-0',
                {
                  'bg-black text-primary border-2 border-[#D4AF37] hover:text-[#E8C547] hover:border-[#E8C547] focus:ring-primary': isWaiting,
                  'bg-black text-[#D4AF37] border-2 border-[#D4AF37] hover:bg-black hover:text-[#E8C547] hover:border-[#E8C547] focus:ring-[#D4AF37]': isServing,
                }
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

          {/* Customer Name */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{formatNameForDisplay(ticket.customerName)}</p>
            {assignedBarber && (() => {
              const preferredBarberId = 'preferredBarberId' in ticket ? (ticket as { preferredBarberId?: number }).preferredBarberId : undefined;
              const isPreferredBarber = preferredBarberId && assignedBarber.id === preferredBarberId;
              return (
                <p className="text-sm text-[rgba(255,255,255,0.7)] truncate flex items-center gap-1">
                  {isPreferredBarber && (
                    <span className="material-symbols-outlined text-xs text-[#D4AF37]">star</span>
                  )}
                  {assignedBarber.name}
                </p>
              );
            })()}
          </div>
        </div>

        {/* Barber Avatar - 40px × 40px for management mode */}
        {(barberAvatarUrl || assignedBarber) && (
          <div className="flex-shrink-0 w-10 h-10 relative">
            {/* Always show placeholder immediately for better perceived performance */}
            <div className={cn(
              'rounded-md bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold flex items-center justify-center absolute inset-0 transition-opacity duration-200',
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
