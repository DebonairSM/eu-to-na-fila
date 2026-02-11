import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { useShopHomeContent } from '@/contexts/ShopConfigContext';
import { Button } from './ui/button';

const NAVIGATION_TIMEOUT_MS = 10000;

function getHomeHref(): string {
  if (typeof window === 'undefined') return '/';
  const match = window.location.pathname.match(/^\/projects\/[^/]+/);
  const base = match ? match[0] : (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') || '/';
  return `${window.location.origin}${base === '/' ? '' : base}/home`;
}

export interface SuspenseWithTimeoutFallbackProps {
  timeoutMs?: number;
}

/**
 * Suspense fallback that shows loading first, then after timeout shows recovery UI
 * (Reload / Go home) so the user is not stuck on a black loading screen.
 */
export function SuspenseWithTimeoutFallback({ timeoutMs = NAVIGATION_TIMEOUT_MS }: SuspenseWithTimeoutFallbackProps) {
  const { t } = useLocale();
  const homeContent = useShopHomeContent();
  const loadingText = homeContent?.accessibility?.loading ?? t('accessibility.loading');
  const [showRecovery, setShowRecovery] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setShowRecovery(true);
      timeoutRef.current = null;
      if (typeof window !== 'undefined' && window.__showRecoveryUI) {
        window.__showRecoveryUI();
      }
    }, timeoutMs);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [timeoutMs]);

  const handleReload = () => {
    if (typeof window !== 'undefined' && window.__clearCacheAndReload) {
      window.__clearCacheAndReload();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = getHomeHref();
  };

  if (showRecovery) {
    return (
      <div
        className="min-h-screen text-white flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: 'var(--shop-background, #0a0a0a)' }}
      >
        <p className="text-sm mb-4" style={{ color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))' }}>
          {t('errors.loadFailed')} {t('errors.generic')}
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button onClick={handleReload} variant="default" size="sm">
            {t('errors.reloadPage')}
          </Button>
          <Button onClick={handleGoHome} variant="outline" size="sm">
            {t('errors.goHome')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ backgroundColor: 'var(--shop-background, #0a0a0a)' }}
    >
      <div
        className="h-1 w-full animate-pulse shrink-0"
        style={{ backgroundColor: 'color-mix(in srgb, var(--shop-accent, #D4AF37) 40%, transparent)' }}
      />
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm" style={{ color: 'var(--shop-text-secondary, rgba(255,255,255,0.6))' }}>
          {loadingText}
        </p>
      </div>
    </div>
  );
}
