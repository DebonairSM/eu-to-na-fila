import { Badge, Heading, Text } from '@/components/design-system';
import { useLocale } from '@/contexts/LocaleContext';
import { formatInClientTimezone } from '@/lib/timezones';

interface StatusHeaderProps {
  customerName: string;
  status: 'pending' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  serviceName?: string | null;
  ticketNumber?: string | null;
  scheduledTime?: string | Date | null;
}

export function StatusHeader({ customerName, status, serviceName, ticketNumber, scheduledTime }: StatusHeaderProps) {
  const { t, locale } = useLocale();
  const isWaiting = status === 'waiting' || status === 'pending';
  const isInProgress = status === 'in_progress';
  const isCompleted = status === 'completed';

  const badgeVariant =
    isWaiting
      ? 'waiting'
      : isInProgress || isCompleted
      ? 'in-progress'
      : 'error';

  const badgeIcon = isWaiting
    ? status === 'pending'
      ? 'event'
      : 'schedule'
    : isInProgress
    ? 'content_cut'
    : 'check_circle';

  const badgeText = status === 'pending'
    ? 'Agendado'
    : isWaiting
    ? t('status.badgeWaiting')
    : isInProgress
    ? t('status.badgeInProgress')
    : t('status.badgeCompleted');

  const scheduledStr = scheduledTime
    ? formatInClientTimezone(scheduledTime, locale)
    : null;

  return (
    <div className="text-center mt-8 sm:mt-0 mb-6 sm:mb-8 lg:mb-10">
      <Heading level={1} className="mb-3 sm:mb-4">
        {customerName}
      </Heading>
      {ticketNumber && (
        <Text size="sm" variant="secondary" className="mb-1">
          Seu número: <span className="font-mono font-semibold text-[var(--shop-accent)]">{ticketNumber}</span>
        </Text>
      )}
      {scheduledStr && status === 'pending' && (
        <Text size="sm" variant="secondary" className="mb-1">
          Agendado para {scheduledStr}. Faça check-in ao chegar.
        </Text>
      )}
      <Text size="sm" variant="secondary" className="mb-2">
        {t('status.serviceLabel')}: {serviceName ?? '—'}
      </Text>
      <Badge variant={badgeVariant} size="default">
        <span className="material-symbols-outlined text-xl sm:text-2xl">{badgeIcon}</span>
        <span>{badgeText}</span>
      </Badge>
    </div>
  );
}
