import { cn } from '@/lib/utils';
import type { Barber } from '@eutonafila/shared';

export interface BarberCardProps {
  barber: Barber;
  isSelected?: boolean;
  onClick?: () => void;
  showPresence?: boolean;
  className?: string;
}

export function BarberCard({
  barber,
  isSelected = false,
  onClick,
  showPresence = false,
  className,
}: BarberCardProps) {
  const avatarUrl =
    barber.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=D4AF37&color=000&size=128`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all',
        'hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring',
        {
          'border-primary bg-primary/10': isSelected,
          'border-border': !isSelected,
          'opacity-50 cursor-not-allowed': showPresence && !barber.isPresent,
        },
        className
      )}
      disabled={showPresence && !barber.isPresent}
      aria-label={`Select barber ${barber.name}`}
    >
      <div className="relative">
        <img
          src={avatarUrl}
          alt={barber.name}
          className="w-16 h-16 rounded-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=D4AF37&color=000&size=128`;
          }}
        />
        {showPresence && (
          <div
            className={cn(
              'absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background',
              barber.isPresent ? 'bg-green-500' : 'bg-gray-400'
            )}
            aria-label={barber.isPresent ? 'Present' : 'Absent'}
          />
        )}
      </div>
      <span className="text-sm font-medium text-center">{barber.name}</span>
      {isSelected && (
        <span className="text-xs text-primary font-medium">Atual</span>
      )}
    </button>
  );
}
