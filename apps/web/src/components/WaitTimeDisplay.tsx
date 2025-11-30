import { cn } from '@/lib/utils';

export interface WaitTimeDisplayProps {
  minutes: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function WaitTimeDisplay({
  minutes,
  className,
  size = 'lg',
}: WaitTimeDisplayProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  const displayValue = minutes !== null ? minutes : '--';

  return (
    <div
      className={cn(
        'text-center p-6 rounded-lg',
        'bg-gradient-to-br from-primary/20 to-primary/10',
        'border border-primary/30',
        className
      )}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="material-symbols-outlined text-primary">schedule</span>
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Tempo estimado de espera
        </span>
      </div>
      <div className={cn('font-bold text-primary', sizeClasses[size])}>
        {displayValue}
      </div>
      <div className="text-sm text-muted-foreground mt-1">minutos</div>
    </div>
  );
}
