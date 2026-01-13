import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export interface ErrorDisplayProps {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, onRetry, className }: ErrorDisplayProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const isChunkError = 
    typeof error === 'object' && 
    error instanceof Error &&
    (error.message.includes('Failed to fetch dynamically imported module') ||
     error.message.includes('Loading chunk') ||
     error.message.includes('ChunkLoadError'));

  const handleReload = () => {
    window.location.reload();
  };

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
      <div className="flex gap-2">
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            Tentar Novamente
          </Button>
        )}
        {isChunkError && (
          <Button onClick={handleReload} variant="default" size="sm">
            Recarregar Página
          </Button>
        )}
      </div>
    </div>
  );
}
