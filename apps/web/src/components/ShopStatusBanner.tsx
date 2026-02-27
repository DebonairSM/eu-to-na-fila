import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getShopStatus } from '@eutonafila/shared';
import { useEffect, useState, useMemo, useCallback } from 'react';

export function ShopStatusBanner() {
  const { config, invalidateConfig } = useShopConfig();
  const { t, locale } = useLocale();
  const settings = config.settings;
  
  // Memoize settings to prevent unnecessary recalculations
  const settingsKey = useMemo(() => 
    JSON.stringify({
      operatingHours: settings.operatingHours,
      timezone: settings.timezone,
      temporaryStatusOverride: settings.temporaryStatusOverride,
      allowQueueBeforeOpen: settings.allowQueueBeforeOpen,
      checkInHoursBeforeOpen: settings.checkInHoursBeforeOpen,
    }),
    [settings.operatingHours, settings.timezone, settings.temporaryStatusOverride, settings.allowQueueBeforeOpen, settings.checkInHoursBeforeOpen]
  );
  
  const [status, setStatus] = useState(() => 
    getShopStatus(
      settings.operatingHours, 
      settings.timezone ?? 'America/Sao_Paulo',
      settings.temporaryStatusOverride,
      settings.allowQueueBeforeOpen,
      settings.checkInHoursBeforeOpen ?? 1
    )
  );

  useEffect(() => {
    const updateStatus = () => {
      setStatus(
        getShopStatus(
          settings.operatingHours, 
          settings.timezone ?? 'America/Sao_Paulo',
          settings.temporaryStatusOverride,
          settings.allowQueueBeforeOpen,
          settings.checkInHoursBeforeOpen ?? 1
        )
      );
    };
    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    return () => clearInterval(interval);
  }, [settingsKey]);

  const handleRefresh = useCallback(() => {
    invalidateConfig();
  }, [invalidateConfig]);

  if (status.isOpen) {
    return null; // Don't show banner when open
  }

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString(locale === 'pt-BR' ? 'pt-BR' : 'en', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const localeTag = locale === 'pt-BR' ? 'pt-BR' : 'en';
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return formatTime(date);
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `${t('shop.tomorrow')} ${t('shop.at')} ${formatTime(date)}`;
    } else {
      return date.toLocaleDateString(localeTag, {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-red-400 text-2xl shrink-0">schedule</span>
        <div className="min-w-0 flex-1">
          <p className="text-white font-medium">
            {status.isOverridden && status.overrideReason
              ? status.overrideReason
              : status.isInLunch 
                ? t('shop.closedForLunch') 
                : t('shop.closed')
            }
          </p>
          {status.nextOpenTime && (
            <p className="text-white/70 text-sm">
              {status.isInLunch 
                ? `${t('shop.returnsAt')} ${formatDate(status.nextOpenTime)}`
                : `${t('shop.opensAt')} ${formatDate(status.nextOpenTime)}`
              }
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          aria-label={t('status.refresh')}
          className="shrink-0 p-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </div>
    </div>
  );
}
