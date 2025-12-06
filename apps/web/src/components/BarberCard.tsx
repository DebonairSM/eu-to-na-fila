import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Barber } from '@eutonafila/shared';

export interface BarberCardProps {
  barber: Barber;
  isSelected?: boolean;
  onClick?: () => void;
  showPresence?: boolean;
  className?: string;
  size?: 'management' | 'kiosk'; // Size context: management = 40px, kiosk = 56px
}

export function BarberCard({
  barber,
  isSelected = false,
  onClick,
  showPresence = false,
  className,
  size = 'management',
}: BarberCardProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl =
    barber.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=D4AF37&color=000&size=128`;

  const avatarSize = size === 'kiosk' ? 'w-14 h-14' : 'w-10 h-10'; // 56px for kiosk, 40px for management
  const avatarSizePx = size === 'kiosk' ? 56 : 40;
  const initials = barber.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-md border-2 transition-all',
        'hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        {
          'border-primary bg-primary/10': isSelected,
          'border-border': !isSelected,
          'opacity-50': showPresence && !barber.isPresent,
        },
        className
      )}
      aria-label={showPresence 
        ? `${barber.name} - ${barber.isPresent ? 'Presente, clique para marcar ausente' : 'Ausente, clique para marcar presente'}` 
        : `Selecionar barbeiro ${barber.name}`}
      aria-pressed={isSelected}
    >
      <div className="relative">
        {!avatarFailed && (
          <img
            src={avatarUrl}
            alt=""
            aria-hidden="true"
            className={cn(avatarSize, 'rounded-md object-cover')}
            onError={() => setAvatarFailed(true)}
          />
        )}
        {avatarFailed && (
          <div
            aria-hidden="true"
            className={cn(
              avatarSize,
              'rounded-md flex items-center justify-center bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold'
            )}
          >
            {initials}
          </div>
        )}
        {showPresence && (
          <div
            className={cn(
              'absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background',
              barber.isPresent ? 'bg-[#10B981]' : 'bg-gray-400'
            )}
            aria-hidden="true"
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
