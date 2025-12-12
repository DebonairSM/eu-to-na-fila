import { Badge, Heading } from '@/components/design-system';

interface StatusHeaderProps {
  customerName: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
}

export function StatusHeader({ customerName, status }: StatusHeaderProps) {
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
    ? 'Aguardando'
    : isInProgress
    ? 'Em Atendimento'
    : 'Concluído';

  return (
    <div className="text-center mt-8 sm:mt-0 mb-6 sm:mb-8 lg:mb-10">
      <Heading level={1} className="mb-3 sm:mb-4">
        {customerName}
      </Heading>
      <Badge variant={badgeVariant} size="default">
        <span className="material-symbols-outlined text-xl sm:text-2xl">{badgeIcon}</span>
        <span>{badgeText}</span>
      </Badge>
    </div>
  );
}
