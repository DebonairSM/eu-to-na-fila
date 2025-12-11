import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { WaitTimeDisplay } from '@/components/WaitTimeDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';

interface WaitTimeBannerProps {
  sticky?: boolean;
}

export function WaitTimeBanner({ sticky = false }: WaitTimeBannerProps) {
  const [waitEstimate, setWaitEstimate] = useState<number | null>(null);
  const [waitLoading, setWaitLoading] = useState(true);
  const [waitError, setWaitError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchWait = async () => {
      try {
        setWaitError(null);
        const debug = await api.getWaitDebug(config.slug);
        if (!mounted) return;
        const nextWait =
          typeof debug.sampleEstimateForNext === 'number'
            ? debug.sampleEstimateForNext
            : null;
        setWaitEstimate(nextWait);
        setWaitLoading(false);
      } catch (err) {
        if (!mounted) return;
        setWaitError(err instanceof Error ? err : new Error('Erro ao obter tempo de espera'));
        setWaitLoading(false);
      }
    };

    fetchWait();
    const interval = setInterval(fetchWait, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (waitLoading) {
    return (
      <div className={`${sticky ? 'sticky top-0 z-40' : ''} bg-[#1a1a1a] border-b border-[rgba(212,175,55,0.2)] py-4`}>
        <div className="container mx-auto px-4">
          <LoadingSpinner text="Calculando tempo de espera..." size="sm" />
        </div>
      </div>
    );
  }

  if (waitError) {
    return (
      <div className={`${sticky ? 'sticky top-0 z-40' : ''} bg-[#1a1a1a] border-b border-[rgba(212,175,55,0.2)] py-4`}>
        <div className="container mx-auto px-4">
          <ErrorDisplay 
            error={waitError} 
            onRetry={() => window.location.reload()} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${sticky ? 'sticky top-0 z-40' : ''} bg-[#1a1a1a] border-b border-[rgba(212,175,55,0.2)] py-4`}>
      <div className="container mx-auto px-4 max-w-7xl">
        <WaitTimeDisplay minutes={waitEstimate} size="md" />
      </div>
    </div>
  );
}
