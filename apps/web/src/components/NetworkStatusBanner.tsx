import { useNetworkStatus } from '@/contexts/NetworkStatusContext';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

export function NetworkStatusBanner() {
  const { isOffline, apiUnavailable, dismissApiUnavailable } = useNetworkStatus();
  const { t } = useLocale();

  if (!isOffline && !apiUnavailable) return null;

  const message = isOffline ? t('errors.offline') : t('errors.apiUnavailable');

  return (
    <div
      role="alert"
      className={cn(
        'fixed top-0 left-0 right-0 z-[9998] px-4 py-2 text-center text-sm',
        'bg-amber-600/95 text-amber-950',
        'dark:bg-amber-500/95 dark:text-amber-950'
      )}
    >
      <span className="font-medium">{message}</span>
      {apiUnavailable && !isOffline && (
        <button
          type="button"
          onClick={dismissApiUnavailable}
          className="ml-2 underline focus:outline-none focus:ring-2 focus:ring-amber-800 rounded"
        >
          {t('common.dismiss')}
        </button>
      )}
    </div>
  );
}
