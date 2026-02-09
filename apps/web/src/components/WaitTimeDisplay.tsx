import { cn } from '@/lib/utils';

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
    displayValue = minutes;
    unitLabel = 'minutos';
  }

  return (
    <div
      className={cn(
        'wait-card text-center p-6 rounded-lg',
        'bg-gradient-to-br from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)]',
        'border-2 border-[rgba(212,175,55,0.3)]',
        className
      )}
    >
      <div className="wait-label flex items-center justify-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[#D4AF37]">schedule</span>
        <span className="text-sm font-medium text-[rgba(255,255,255,0.7)] uppercase tracking-wide">
          Tempo estimado
        </span>
      </div>
      <div
        className={cn(
          'wait-value font-bold leading-tight',
          unavailable ? 'text-white/40' : 'text-[#D4AF37]',
          typeof displayValue === 'string' && displayValue.length > 5
            ? 'text-2xl sm:text-3xl md:text-4xl'
            : sizeClasses[size]
        )}
      >
        {displayValue}
      </div>
      <div className="wait-unit text-sm text-[rgba(255,255,255,0.5)] mt-1">{unitLabel}</div>
    </div>
  );
}
