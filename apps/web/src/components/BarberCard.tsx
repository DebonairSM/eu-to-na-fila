import { useState, memo } from 'react';
import { cn } from '@/lib/utils';
import type { Barber } from '@eutonafila/shared';

export interface BarberCardProps {
  barber: Barber;
  isSelected?: boolean;
  onClick?: () => void;
  showPresence?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  size?: 'management' | 'kiosk'; // Size context: management = 40px, kiosk = 56px
}

export const BarberCard = memo(function BarberCard({
  barber,
  isSelected = false,
  onClick,
  showPresence = false,
  disabled = false,
  disabledReason,
  className,
  size = 'management',
}: BarberCardProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const avatarUrl =
    barber.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=D4AF37&color=000&size=128`;

  const avatarSize = size === 'kiosk' ? 'w-14 h-14' : 'w-10 h-10'; // 56px for kiosk, 40px for management
  const initials = barber.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-md border-2 transition-all',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        {
          'border-primary bg-primary/10': isSelected,
          'border-border': !isSelected,
          'opacity-50 cursor-not-allowed': disabled || (showPresence && !barber.isPresent),
          'hover:border-primary hover:bg-primary/5': !disabled && !(showPresence && !barber.isPresent),
        },
        className
      )}
      aria-label={
        disabled && disabledReason
          ? `${barber.name} - ${disabledReason}`
          : showPresence 
            ? `${barber.name} - ${barber.isPresent ? 'Presente, clique para marcar ausente' : 'Ausente, clique para marcar presente'}` 
            : `Selecionar barbeiro ${barber.name}`
      }
      aria-pressed={isSelected}
      aria-disabled={disabled}
      title={disabled ? disabledReason : undefined}
    >
      <div className={cn(avatarSize, 'relative')}>
        {/* Always show placeholder immediately for better perceived performance */}
        <div
          className={cn(
            'rounded-md flex items-center justify-center bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold absolute inset-0 transition-opacity duration-200',
            imageLoaded && 'opacity-0 pointer-events-none'
          )}
          aria-hidden="true"
        >
          {initials}
        </div>
        {!avatarFailed && (
          <img
            src={avatarUrl}
            alt=""
            aria-hidden="true"
            className={cn(avatarSize, 'rounded-md object-cover relative z-10')}
            loading="lazy"
            decoding="async"
            width={size === 'kiosk' ? 56 : 40}
            height={size === 'kiosk' ? 56 : 40}
            onLoad={() => {
              setImageLoaded(true);
            }}
            onError={() => {
              setAvatarFailed(true);
            }}
          />
        )}
        {showPresence && (
          <div
            className={cn(
              'absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background z-20',
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
      {disabled && disabledReason && (
        <span className="text-xs text-muted-foreground text-center mt-1">{disabledReason}</span>
      )}
    </button>
  );
});
