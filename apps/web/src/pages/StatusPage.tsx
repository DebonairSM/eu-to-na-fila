import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useTicketStatus } from '@/hooks/useTicketStatus';
import { useQueue } from '@/hooks/useQueue';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';
import { cn } from '@/lib/utils';

const AVG_SERVICE_TIME = 20; // minutes

export function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const ticketId = id ? parseInt(id, 10) : null;
  const navigate = useNavigate();
  const { ticket, isLoading, error } = useTicketStatus(ticketId);
  const { data: queueData } = useQueue(3000); // Poll every 3s
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Calculate wait time
  const waitTime = (() => {
    if (!ticket || ticket.status !== 'waiting' || !queueData) return null;

    const waitingTickets = queueData.tickets.filter((t) => t.status === 'waiting');
    const aheadCount = waitingTickets.filter((t) => t.position < ticket.position).length;
    const inProgressTickets = queueData.tickets.filter((t) => t.status === 'in_progress');
    const activeBarbers = new Set(
      inProgressTickets.map((t) => t.barberId).filter((id): id is number => id !== null)
    ).size || 1;

    if (aheadCount === 0) return 0;
    const estimated = Math.ceil((aheadCount / activeBarbers) * AVG_SERVICE_TIME);
    return Math.max(5, Math.round(estimated / 5) * 5);
  })();

  const handleLeaveQueue = async () => {
    if (!ticketId) return;

    setIsLeaving(true);
    try {
      await api.cancelTicket(ticketId);
      navigate('/');
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else if (error && typeof error === 'object' && 'error' in error) {
        alert((error as { error: string }).error);
      } else {
        alert('Erro ao sair da fila. Tente novamente.');
      }
    } finally {
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-12 max-w-md">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Nenhum ticket ID fornecido</p>
            <Link to="/">
              <button className="px-4 py-2 bg-transparent text-[rgba(255,255,255,0.7)] border-2 border-[rgba(255,255,255,0.3)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all">
                Voltar ao Início
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-12 max-w-md">
          <LoadingSpinner size="lg" text="Carregando status do ticket..." />
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-12 max-w-md">
          <ErrorDisplay
            error={error || new Error('Ticket não encontrado')}
            onRetry={() => window.location.reload()}
          />
          <div className="mt-4">
            <Link to="/">
              <button className="w-full px-4 py-2 bg-transparent text-[rgba(255,255,255,0.7)] border-2 border-[rgba(255,255,255,0.3)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all">
                Voltar ao Início
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isWaiting = ticket.status === 'waiting';
  const isInProgress = ticket.status === 'in_progress';
  const isCompleted = ticket.status === 'completed';

  // Calculate position info
  const positionInfo = (() => {
    if (!isWaiting || !queueData) return null;
    const waitingTickets = queueData.tickets.filter((t) => t.status === 'waiting');
    const aheadCount = waitingTickets.filter((t) => t.position < ticket.position).length;
    return {
      position: ticket.position,
      ahead: aheadCount,
      total: waitingTickets.length,
    };
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.03)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />
      <Navigation />
      <div className="container relative z-10 mx-auto px-4 sm:px-5 pt-20 sm:pt-[100px] pb-12 max-w-[480px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          {/* Header */}
          <div className="header text-center mb-8">
            <h1 className="customer-name font-['Playfair_Display',serif] text-[1.75rem] font-semibold text-white mb-3">
              {ticket.customerName}
            </h1>
            <div
              className={cn(
                'status-badge inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium uppercase mb-4',
                {
                  'bg-[rgba(212,175,55,0.2)] border-2 border-[#D4AF37] text-[#D4AF37]': isWaiting,
                  'bg-[rgba(34,197,94,0.2)] border-2 border-[#22c55e] text-[#22c55e]': isInProgress || isCompleted,
                }
              )}
            >
              <span className="material-symbols-outlined text-lg">
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

          {/* Waiting State */}
          {isWaiting && (
            <div className="main-card bg-gradient-to-br from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)] border-2 border-[rgba(212,175,55,0.3)] rounded-3xl p-8 sm:p-12 text-center mb-6">
              <div className="wait-label flex items-center justify-center gap-2 mb-4 text-[rgba(255,255,255,0.7)] text-xs sm:text-sm uppercase tracking-wider">
                <span className="material-symbols-outlined text-[#D4AF37]">schedule</span>
                Tempo estimado
              </div>
              <div className="wait-value font-['Playfair_Display',serif] text-4xl sm:text-6xl font-semibold text-white mb-2 drop-shadow-[0_4px_20px_rgba(212,175,55,0.3)]">
                {waitTime !== null ? waitTime : '--'}
              </div>
              <div className="wait-unit text-lg sm:text-xl text-[rgba(255,255,255,0.7)] mb-6">minutos</div>
              
              {positionInfo && (
                <div className="mt-6 pt-6 border-t border-[rgba(212,175,55,0.2)]">
                  <p className="text-sm text-[rgba(255,255,255,0.7)] mb-2">
                    Posição na fila
                  </p>
                  <p className="text-2xl font-semibold text-[#D4AF37]">
                    {positionInfo.position} de {positionInfo.total}
                  </p>
                  {positionInfo.ahead > 0 && (
                    <p className="text-xs text-[rgba(255,255,255,0.5)] mt-2">
                      {positionInfo.ahead} {positionInfo.ahead === 1 ? 'pessoa à frente' : 'pessoas à frente'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* In Progress State */}
          {isInProgress && (
            <div className="progress-card bg-gradient-to-br from-[rgba(34,197,94,0.2)] to-[rgba(34,197,94,0.05)] border-2 border-[rgba(34,197,94,0.3)] rounded-3xl p-8 sm:p-12 text-center mb-6">
              <span className="material-symbols-outlined text-5xl sm:text-6xl text-[#22c55e] mb-4 block">content_cut</span>
              <div className="progress-title font-['Playfair_Display',serif] text-xl sm:text-2xl text-white mb-2">
                Você está sendo atendido!
              </div>
              <div className="progress-message text-[rgba(255,255,255,0.7)]">
                Aproveite seu corte
              </div>
            </div>
          )}

          {/* Completed State */}
          {isCompleted && (
            <div className="completed-card bg-gradient-to-br from-[#22c55e] to-[#16a34a] rounded-3xl p-8 sm:p-12 text-center mb-6">
              <span className="material-symbols-outlined text-5xl sm:text-6xl text-white mb-4 block">check_circle</span>
              <div className="progress-title font-['Playfair_Display',serif] text-xl sm:text-2xl text-white mb-2">
                Atendimento concluído!
              </div>
              <div className="progress-message text-white/90">
                Obrigado por usar nosso sistema
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {isWaiting && (
              <button
                className="w-full px-6 py-4 bg-[#ef4444] text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#dc2626] transition-all disabled:opacity-50"
                onClick={() => setShowLeaveConfirm(true)}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">hourglass_top</span>
                    Saindo...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">exit_to_app</span>
                    Sair da Fila
                  </>
                )}
              </button>
            )}

            {isCompleted && (
              <Link to="/">
                <button className="w-full px-6 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg flex items-center justify-center gap-2 hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all">
                  <span className="material-symbols-outlined">home</span>
                  Voltar ao Início
                </button>
              </Link>
            )}

            <Link to="/">
              <button className="w-full px-4 py-3 bg-transparent text-[rgba(255,255,255,0.7)] border-2 border-[rgba(255,255,255,0.3)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all">
                Voltar
              </button>
            </Link>
          </div>

          {/* Auto-update notice */}
          <div className="refresh-indicator flex items-center justify-center gap-2 mt-6 text-xs text-[rgba(255,255,255,0.5)]">
            <span className="refresh-dot w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-pulse" />
            Atualizando automaticamente
          </div>
        </div>
      </div>

      {/* Leave Queue Confirmation */}
      <ConfirmationDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeaveQueue}
        title="Sair da Fila?"
        message={`Tem certeza que deseja sair da fila? Você perderá sua posição.`}
        confirmText="Sair"
        cancelText="Cancelar"
        variant="destructive"
        icon="exit_to_app"
      />
    </div>
  );
}
