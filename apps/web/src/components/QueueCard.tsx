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
        'p-4 rounded-lg border bg-card transition-all',
        'hover:border-primary cursor-pointer',
        {
          'border-green-500 bg-green-500/10': isServing,
          'border-border': isWaiting,
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
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
              {
                'bg-primary text-primary-foreground': isWaiting,
                'bg-green-500 text-white': isServing,
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
              <span className="material-symbols-outlined text-lg">check</span>
            ) : (
              ticket.position
            )}
          </div>

          {/* Customer Name */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{ticket.customerName}</p>
            {assignedBarber && (
              <p className="text-sm text-muted-foreground truncate">
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
              className="w-10 h-10 rounded-full object-cover"
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
