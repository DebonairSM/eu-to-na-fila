import { Card, CardContent } from '@/components/design-system';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useLocale } from '@/contexts/LocaleContext';
import type { Barber } from '@eutonafila/shared';

interface BarberWaitTime {
  barberId: number;
  barberName: string;
  waitTime: number | null;
  isPresent: boolean;
}

interface ActiveBarbersInfoProps {
  barbers: Barber[];
  waitTimes: {
    standardWaitTime: number | null;
    barberWaitTimes: BarberWaitTime[];
  } | null;
  isLoading?: boolean;
}

export function ActiveBarbersInfo({
  barbers,
  waitTimes,
  isLoading = false,
}: ActiveBarbersInfoProps) {
  const { t } = useLocale();
  const presentBarbers = barbers.filter((b) => b.isActive && b.isPresent);
  const standardWaitTime = waitTimes?.standardWaitTime ?? null;
  const hasActiveBarbers = presentBarbers.length > 0;

  const formatWaitTime = (minutes: number | null): string => {
    if (!hasActiveBarbers) return t('join.unavailable');
    if (minutes === null) return '--';
    if (minutes <= 0) return t('status.now');
    return `${minutes} ${t('common.minutes')}`;
  };

  if (isLoading) {
    return (
      <Card variant="default">
        <CardContent className="p-6">
          <LoadingSpinner text={t('common.loading')} size="sm" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default" className="shadow-lg overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        {/* Highlighted estimated time */}
        <div className="text-center mb-6">
          <p className="text-sm uppercase tracking-wider text-[var(--shop-text-secondary)] mb-1">
            {t('join.estimatedTime')}
          </p>
          <p
            className={`font-bold tabular-nums ${
              !hasActiveBarbers
                ? 'text-2xl sm:text-3xl text-[var(--shop-text-secondary)] opacity-70'
                : 'text-4xl sm:text-5xl text-[var(--shop-accent)]'
            }`}
          >
            {formatWaitTime(standardWaitTime)}
          </p>
          {!hasActiveBarbers && (
            <p className="text-xs text-[var(--shop-text-secondary)] opacity-70 mt-1">{t('join.noBarberActive')}</p>
          )}
        </div>

        {/* Available barbers — compact list */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {presentBarbers.length === 0 ? (
            <p className="text-sm text-[var(--shop-text-secondary)]">{t('join.noBarberAvailable')}</p>
          ) : (
            presentBarbers.map((barber) => (
              <span
                key={barber.id}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/5 border border-[var(--shop-border-color)] text-sm text-[var(--shop-text-primary)]"
              >
                {barber.name}
              </span>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
