import { useState, memo } from 'react';
import { cn, formatNameForDisplay } from '@/lib/utils';
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
  barbers = [],
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

  const barberAvatarUrl =
    assignedBarber?.avatarUrl ||
    (assignedBarber
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(assignedBarber.name)}&background=D4AF37&color=000&size=64`
      : null);
  const barberInitials = assignedBarber?.name?.charAt(0)?.toUpperCase() || '';
  const showAvatarImage = barberAvatarUrl && !barberAvatarFailed;

  return (
    <div
      className={cn(
        'queue-item p-6 rounded-md border-2 transition-all cursor-pointer',
        'hover:border-primary hover:bg-primary/5',
        {
          'border-[#10B981] bg-[#10B981]/10': isServing,
          'border-primary/30 bg-card': isWaiting,
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
          {/* Position Badge - 52px × 52px for management mode */}
          <button
            type="button"
            className={cn(
              'flex-shrink-0 w-[52px] h-[52px] rounded-md flex items-center justify-center font-bold text-lg cursor-pointer transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2',
              {
                'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary': isWaiting,
                'bg-[#10B981] text-white hover:bg-[#10B981]/90 focus:ring-[#10B981]': isServing,
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

          {/* Customer Name */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{formatNameForDisplay(ticket.customerName)}</p>
            {assignedBarber && (
              <p className="text-sm text-[rgba(255,255,255,0.7)] truncate">
                {assignedBarber.name}
              </p>
            )}
            {(() => {
              const preferredBarberId = 'preferredBarberId' in ticket ? (ticket as { preferredBarberId?: number }).preferredBarberId : undefined;
              return preferredBarberId && (!assignedBarber || assignedBarber.id !== preferredBarberId) ? (() => {
                const preferredBarber = barbers.find((b) => b.id === preferredBarberId);
                return preferredBarber ? (
                  <p className="text-xs text-[#D4AF37]/80 truncate flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-xs">star</span>
                    Preferência: {preferredBarber.name}
                  </p>
                ) : null;
              })() : null;
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
            {showAvatarImage && (
              <img
                src={barberAvatarUrl || undefined}
                alt={assignedBarber?.name || 'Barber'}
                className="w-10 h-10 rounded-md object-cover relative z-10"
                loading="lazy"
                decoding="async"
                width={40}
                height={40}
                onLoad={() => {
                  setBarberImageLoaded(true);
                }}
                onError={() => {
                  setBarberAvatarFailed(true);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
});
