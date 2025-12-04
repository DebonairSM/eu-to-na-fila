import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export interface ErrorDisplayProps {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, onRetry, className }: ErrorDisplayProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-5 p-8 text-center',
        className
      )}
      role="alert"
    >
      <span className="material-symbols-outlined text-5xl text-destructive">
        error
      </span>
      <div>
        <h3 className="font-semibold mb-1">Erro</h3>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          Tentar Novamente
        </Button>
      )}
    </div>
  );
}
