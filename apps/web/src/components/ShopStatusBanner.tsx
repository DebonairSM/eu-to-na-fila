import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getShopStatus } from '@eutonafila/shared';
import { useEffect, useState } from 'react';

export function ShopStatusBanner() {
  const { settings } = useShopConfig();
  const { t } = useLocale();
  const [status, setStatus] = useState(() => 
    getShopStatus(
      settings.operatingHours, 
      settings.timezone ?? 'America/Sao_Paulo',
      settings.temporaryStatusOverride,
      settings.allowQueueBeforeOpen
    )
  );

  // Update status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(
        getShopStatus(
          settings.operatingHours, 
          settings.timezone ?? 'America/Sao_Paulo',
          settings.temporaryStatusOverride,
          settings.allowQueueBeforeOpen
        )
      );
    }, 60000);
    return () => clearInterval(interval);
  }, [settings.operatingHours, settings.timezone, settings.temporaryStatusOverride, settings.allowQueueBeforeOpen]);

  if (status.isOpen) {
    return null; // Don't show banner when open
  }

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return formatTime(date);
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `${t('shop.tomorrow')} ${t('shop.at')} ${formatTime(date)}`;
    } else {
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-red-400 text-2xl">schedule</span>
        <div>
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
      </div>
    </div>
  );
}
