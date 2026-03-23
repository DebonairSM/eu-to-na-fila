import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { STORAGE_KEYS } from '@/lib/constants';
import { applyTrackingConsent, clearTrackingCookie } from '@/lib/trackingCookie';
import { getOrCreateDeviceId } from '@/lib/utils';

const CONSENT_KEY = STORAGE_KEYS.TRACKING_CONSENT;
const AUTO_ALLOW_MS = 60_000;

export function TrackingConsentBanner() {
  const { t } = useLocale();
  const [visible, setVisible] = useState<boolean | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyAllow = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, 'true');
      applyTrackingConsent(true, getOrCreateDeviceId());
    } catch {
      // ignore
    }
    setVisible(false);
  }, []);

  const applyDeny = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, 'false');
      clearTrackingCookie();
    } catch {
      // ignore
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'true' || stored === 'false') {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    if (visible !== true) return;
    timeoutRef.current = setTimeout(applyAllow, AUTO_ALLOW_MS);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [visible, applyAllow]);

  if (visible !== true) return null;

  return (
    <div
      role="dialog"
      aria-label={t('join.trackingConsentLabel')}
      className="fixed bottom-0 left-0 right-0 z-[9998] p-4 safe-area-pb"
      style={{
        backgroundColor: 'var(--shop-surface-secondary)',
        borderTop: '1px solid var(--shop-border-color)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      }}
    >
      <div className="max-w-2xl mx-auto flex flex-wrap items-center gap-3 sm:gap-4">
        <p className="text-sm text-[var(--shop-text-primary)] flex-1 min-w-0">
          {t('join.trackingConsentLabel')}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={applyDeny}
            className="py-2 px-4 rounded-lg border border-[rgba(255,255,255,0.25)] text-[var(--shop-text-secondary)] text-sm font-medium hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-surface-secondary)]"
          >
            {t('join.trackingDeny')}
          </button>
          <button
            type="button"
            onClick={applyAllow}
            className="py-2 px-4 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-surface-secondary)]"
            style={{
              color: '#0a0a0a',
              backgroundColor: 'var(--shop-accent)',
            }}
          >
            {t('join.trackingAllow')}
          </button>
          <button
            type="button"
            onClick={applyAllow}
            className="p-2 rounded-lg text-[var(--shop-text-secondary)] hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-surface-secondary)]"
            aria-label={t('accessibility.closeModal')}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
