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

  const fetchWait = async () => {
    try {
      setWaitError(null);
      setWaitLoading(true);
      const debug = await api.getWaitDebug(config.slug);
      const nextWait =
        typeof debug.sampleEstimateForNext === 'number'
          ? debug.sampleEstimateForNext
          : null;
      setWaitEstimate(nextWait);
      setWaitLoading(false);
    } catch (err) {
      setWaitError(err instanceof Error ? err : new Error('Erro ao obter tempo de espera'));
      setWaitLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadWait = async () => {
      await fetchWait();
      if (!mounted) return;
    };

    loadWait();
    const interval = setInterval(() => {
      if (mounted) {
        fetchWait();
      }
    }, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (waitLoading) {
    return (
      <div className={`${sticky ? 'sticky top-0 z-40' : ''} bg-[#1a1a1a] border-b border-[rgba(212,175,55,0.2)] py-6 sm:py-8`}>
        <div className="container mx-auto px-4">
          <LoadingSpinner text="Calculando tempo de espera..." size="sm" />
        </div>
      </div>
    );
  }

  if (waitError) {
    return (
      <div className={`${sticky ? 'sticky top-0 z-40' : ''} bg-[#1a1a1a] border-b border-[rgba(212,175,55,0.2)] py-6 sm:py-8`}>
        <div className="container mx-auto px-4">
          <ErrorDisplay 
            error={waitError} 
            onRetry={fetchWait} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${sticky ? 'sticky top-0 z-40' : ''} bg-[#1a1a1a] border-b border-[rgba(212,175,55,0.2)] py-6 sm:py-8`}>
      <div className="container mx-auto px-4 max-w-7xl">
        <WaitTimeDisplay minutes={waitEstimate} size="lg" />
      </div>
    </div>
  );
}
