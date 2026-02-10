import { Badge, Heading, Text } from '@/components/design-system';
import { useLocale } from '@/contexts/LocaleContext';

interface StatusHeaderProps {
  customerName: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  serviceName?: string | null;
}

export function StatusHeader({ customerName, status, serviceName }: StatusHeaderProps) {
  const { t } = useLocale();
  const isWaiting = status === 'waiting';
  const isInProgress = status === 'in_progress';
  const isCompleted = status === 'completed';

  const badgeVariant =
    isWaiting
      ? 'waiting'
      : isInProgress || isCompleted
      ? 'in-progress'
      : 'error';

  const badgeIcon = isWaiting
    ? 'schedule'
    : isInProgress
    ? 'content_cut'
    : 'check_circle';

  const badgeText = isWaiting
    ? t('status.badgeWaiting')
    : isInProgress
    ? t('status.badgeInProgress')
    : t('status.badgeCompleted');

  return (
    <div className="text-center mt-8 sm:mt-0 mb-6 sm:mb-8 lg:mb-10">
      <Heading level={1} className="mb-3 sm:mb-4">
        {customerName}
      </Heading>
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
