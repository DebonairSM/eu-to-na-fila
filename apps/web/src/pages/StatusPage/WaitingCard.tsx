import { Card, CardContent, Heading, Text, StatusTransition } from '@/components/design-system';
import { useLocale } from '@/contexts/LocaleContext';
import { formatDurationMinutes } from '@/lib/formatDuration';

interface WaitingCardProps {
  waitTime: number | null;
  position?: number;
  total?: number;
  ahead?: number;
  /** When set, shows that the wait is for this barber (preferred barber line). */
  preferredBarberName?: string;
  /** When set, shows that the general line would be faster (e.g. "General line: 15 min — Faster"). */
  generalLineWaitTime?: number;
}

export function WaitingCard({ waitTime, position, total, ahead, preferredBarberName, generalLineWaitTime }: WaitingCardProps) {
  const { t } = useLocale();
  return (
    <StatusTransition status="waiting">
      <Card
        variant="outlined"
        className="status-card bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_15%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_5%,transparent)] border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] text-center"
      >
        <CardContent className="p-10">
          <div className="flex items-center justify-center gap-3 mb-6 text-[var(--shop-text-secondary)] text-sm uppercase tracking-wider">
            <span className="material-symbols-outlined text-2xl text-[var(--shop-accent)]">
              schedule
            </span>
          </div>
          {preferredBarberName && (
            <Text size="sm" variant="secondary" className="mb-2">
              {t('status.prefersBarber')} {preferredBarberName}
            </Text>
          )}
          <Heading
            level={1}
            className="text-6xl font-semibold text-[var(--shop-text-primary)] mb-3 drop-shadow-[0_4px_20px_color-mix(in_srgb,var(--shop-accent)_30%,transparent)] leading-tight"
          >
            {waitTime === null ? '--' : waitTime <= 0 ? t('status.now') : formatDurationMinutes(waitTime)}
          </Heading>
          <Text size="lg" variant="secondary" className="mb-6 text-xl">
            {waitTime !== null && waitTime <= 0 ? t('status.yourTurn') : ''}
          </Text>
          {generalLineWaitTime != null && (
            <Text size="xs" variant="tertiary" className="mb-4">
              {t('join.generalLine')}: {formatDurationMinutes(generalLineWaitTime)} — {t('join.faster')}
            </Text>
          )}

          {position !== undefined && total !== undefined && (
            <div className="mt-6 pt-6 border-t border-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)]">
              <Text size="sm" variant="secondary" className="mb-2">
                {t('status.positionInQueue')}
              </Text>
              <Text size="xl" className="text-[var(--shop-accent)] font-semibold text-4xl">
                {position} de {total}
              </Text>
              {ahead !== undefined && ahead > 0 && (
                <Text size="xs" variant="tertiary" className="mt-2">
                  {ahead} {ahead === 1 ? t('status.personAhead') : t('status.peopleAhead')}
                </Text>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </StatusTransition>
  );
}
