import { cn } from '@/lib/utils';
import type { Ticket, Barber } from '@eutonafila/shared';

export interface QueueCardProps {
  ticket: Ticket;
  assignedBarber?: Barber | null;
  onClick?: () => void;
  onRemove?: () => void;
  onComplete?: () => void;
  className?: string;
}

export function QueueCard({
  ticket,
  assignedBarber,
  onClick,
  onRemove,
  onComplete,
  className,
}: QueueCardProps) {
  const isServing = ticket.status === 'in_progress';
  const isWaiting = ticket.status === 'waiting';

  const barberAvatarUrl =
    assignedBarber?.avatarUrl ||
    (assignedBarber
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(assignedBarber.name)}&background=D4AF37&color=000&size=64`
      : null);

  return (
    <div
      className={cn(
        'queue-item p-4 rounded-lg border-2 transition-all cursor-pointer',
        'hover:border-[#D4AF37] hover:bg-[rgba(212,175,55,0.05)]',
        {
          'border-[#22c55e] bg-[rgba(34,197,94,0.1)]': isServing,
          'border-[rgba(212,175,55,0.3)] bg-[rgba(20,20,20,0.5)]': isWaiting,
        },
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Position Badge */}
          <div
            className={cn(
              'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-base',
              {
                'bg-[#D4AF37] text-[#0a0a0a]': isWaiting,
                'bg-[#22c55e] text-white': isServing,
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
            role="button"
            aria-label={
              isServing ? 'Finalizar atendimento' : 'Remover da fila'
            }
          >
            {isServing ? (
              <span className="material-symbols-outlined text-xl">check</span>
            ) : (
              ticket.position
            )}
          </div>

          {/* Customer Name */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{ticket.customerName}</p>
            {assignedBarber && (
              <p className="text-sm text-[rgba(255,255,255,0.7)] truncate">
                {assignedBarber.name}
              </p>
            )}
          </div>
        </div>

        {/* Barber Avatar */}
        {barberAvatarUrl && (
          <div className="flex-shrink-0">
            <img
              src={barberAvatarUrl}
              alt={assignedBarber?.name || 'Barber'}
              className="w-12 h-12 rounded-full object-cover border-2 border-[rgba(212,175,55,0.3)]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (assignedBarber) {
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(assignedBarber.name)}&background=D4AF37&color=000&size=64`;
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
