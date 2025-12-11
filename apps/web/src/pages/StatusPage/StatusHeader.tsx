import { cn } from '@/lib/utils';

interface StatusHeaderProps {
  customerName: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
}

export function StatusHeader({ customerName, status }: StatusHeaderProps) {
  const isWaiting = status === 'waiting';
  const isInProgress = status === 'in_progress';
  const isCompleted = status === 'completed';

  return (
    <div className="header text-center mb-6 sm:mb-8 lg:mb-10">
      <h1 className="customer-name font-['Playfair_Display',serif] text-[clamp(1.6rem,4vw,2.5rem)] lg:text-3xl font-semibold text-white mb-3 sm:mb-4">
        {customerName}
      </h1>
      <div
        className={cn(
          'status-badge inline-flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base font-medium uppercase',
          {
            'bg-[rgba(212,175,55,0.2)] border-2 border-[#D4AF37] text-[#D4AF37]': isWaiting,
            'bg-[rgba(34,197,94,0.2)] border-2 border-[#22c55e] text-[#22c55e]': isInProgress || isCompleted,
          }
        )}
      >
        <span className="material-symbols-outlined text-xl sm:text-2xl">
          {isWaiting
            ? 'schedule'
            : isInProgress
            ? 'content_cut'
            : 'check_circle'}
        </span>
        <span>
          {isWaiting
            ? 'Aguardando'
            : isInProgress
            ? 'Em Atendimento'
            : 'Concluído'}
        </span>
      </div>
    </div>
  );
}
