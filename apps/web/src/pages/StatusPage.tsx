import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useTicketStatus } from '@/hooks/useTicketStatus';
import { useQueue } from '@/hooks/useQueue';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { WaitTimeDisplay } from '@/components/WaitTimeDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Button } from '@/components/ui/button';
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
      console.error('Error leaving queue:', error);
      alert('Erro ao sair da fila. Tente novamente.');
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
              <Button variant="outline">Voltar ao Início</Button>
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
              <Button variant="outline" className="w-full">
                Voltar ao Início
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isWaiting = ticket.status === 'waiting';
  const isInProgress = ticket.status === 'in_progress';
  const isCompleted = ticket.status === 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-md">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Status do Atendimento</h1>
            <p className="text-muted-foreground">{ticket.customerName}</p>
          </div>

          {/* Wait Time Display - Large and Prominent */}
          {isWaiting && <WaitTimeDisplay minutes={waitTime} size="lg" />}

          {/* Status Badge */}
          <div
            className={cn(
              'p-6 rounded-xl border-2 text-center',
              {
                'bg-amber-500/10 border-amber-500': isWaiting,
                'bg-green-500/10 border-green-500': isInProgress || isCompleted,
              }
            )}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <span
                className={cn('material-symbols-outlined text-3xl', {
                  'text-amber-500': isWaiting,
                  'text-green-500': isInProgress || isCompleted,
                })}
              >
                {isWaiting
                  ? 'schedule'
                  : isInProgress
                  ? 'content_cut'
                  : 'check_circle'}
              </span>
              <h2 className="text-2xl font-bold">
                {isWaiting
                  ? 'Aguardando'
                  : isInProgress
                  ? 'Em Atendimento'
                  : 'Concluído'}
              </h2>
            </div>
            {isInProgress && (
              <p className="text-lg text-muted-foreground mt-2">
                Você está sendo atendido!
              </p>
            )}
            {isCompleted && (
              <p className="text-lg text-muted-foreground mt-2">
                Atendimento concluído!
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {isWaiting && (
              <Button
                variant="destructive"
                className="w-full"
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
              </Button>
            )}

            {isCompleted && (
              <Link to="/">
                <Button className="w-full" size="lg">
                  <span className="material-symbols-outlined">home</span>
                  Voltar ao Início
                </Button>
              </Link>
            )}

            <Link to="/">
              <Button variant="outline" className="w-full">
                Voltar
              </Button>
            </Link>
          </div>

          {/* Auto-update notice */}
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">
              Atualiza automaticamente a cada 3 segundos
            </p>
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
