import { cn } from '@/lib/utils';
import { formatDurationMinutes } from '@/lib/formatDuration';

export interface WaitTimeDisplayProps {
  minutes: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  unavailable?: boolean;
}

export function WaitTimeDisplay({
  minutes,
  className,
  size = 'lg',
  unavailable = false,
}: WaitTimeDisplayProps) {
  const sizeClasses = {
    sm: 'text-2xl sm:text-3xl',
    md: 'text-3xl sm:text-4xl md:text-5xl',
    lg: 'text-4xl sm:text-5xl md:text-6xl',
  };

  let displayValue: string | number;
  let unitLabel: string;

  if (unavailable) {
    displayValue = 'Indisponível';
    unitLabel = 'nenhum barbeiro ativo';
  } else if (minutes === null) {
    displayValue = '--';
    unitLabel = 'minutos';
  } else if (minutes <= 0) {
    displayValue = 'Agora';
    unitLabel = 'sem espera';
  } else {
    displayValue = formatDurationMinutes(minutes);
    unitLabel = '';
  }

  return (
    <div
      className={cn(
        'wait-card text-center p-6 rounded-lg',
        'bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_15%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_5%,transparent)]',
        'border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)]',
        className
      )}
    >
      <div className="wait-label flex items-center justify-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[var(--shop-accent)]">schedule</span>
        <span className="text-sm font-medium text-[var(--shop-text-secondary)] uppercase tracking-wide">
          Tempo estimado
        </span>
      </div>
      <div
        className={cn(
          'wait-value font-bold leading-tight',
          unavailable ? 'text-[var(--shop-text-secondary)] opacity-70' : 'text-[var(--shop-accent)]',
          typeof displayValue === 'string' && displayValue.length > 5
            ? 'text-2xl sm:text-3xl md:text-4xl'
            : sizeClasses[size]
        )}
      >
        {displayValue}
      </div>
      {unitLabel ? <div className="wait-unit text-sm text-[var(--shop-text-secondary)] mt-1">{unitLabel}</div> : null}
    </div>
  );
}
