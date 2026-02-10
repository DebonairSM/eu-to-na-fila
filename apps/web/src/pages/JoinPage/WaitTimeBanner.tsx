import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { WaitTimeDisplay } from '@/components/WaitTimeDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';

interface WaitTimeBannerProps {
  sticky?: boolean;
}

export function WaitTimeBanner({ sticky = false }: WaitTimeBannerProps) {
  const shopSlug = useShopSlug();
  const [waitEstimate, setWaitEstimate] = useState<number | null>(null);
  const [waitLoading, setWaitLoading] = useState(true);
  const [waitError, setWaitError] = useState<Error | null>(null);

  const fetchWait = async () => {
    try {
      setWaitError(null);
      setWaitLoading(true);
      const debug = await api.getWaitDebug(shopSlug);
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
  }, [shopSlug]);

  if (waitLoading) {
    return (
      <div className={`${sticky ? 'sticky top-0 z-40' : ''} bg-[var(--shop-surface-secondary)] border-b border-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)] py-6 sm:py-8`}>
        <div className="container mx-auto px-4">
          <LoadingSpinner text="Calculando tempo de espera..." size="sm" />
        </div>
      </div>
    );
  }

  if (waitError) {
    return (
      <div className={`${sticky ? 'sticky top-0 z-40' : ''} bg-[var(--shop-surface-secondary)] border-b border-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)] py-6 sm:py-8`}>
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
    <div className={`${sticky ? 'sticky top-0 z-40' : ''} bg-[var(--shop-surface-secondary)] border-b border-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)] py-6 sm:py-8`}>
      <div className="container mx-auto px-4 max-w-7xl">
        <WaitTimeDisplay minutes={waitEstimate} size="lg" />
      </div>
    </div>
  );
}
