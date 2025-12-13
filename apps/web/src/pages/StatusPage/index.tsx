import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useTicketStatus } from '@/hooks/useTicketStatus';
import { useQueue } from '@/hooks/useQueue';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';
import { useStatusDisplay } from './hooks/useStatusDisplay';
import { StatusHeader } from './StatusHeader';
import { WaitingCard } from './WaitingCard';
import { InProgressCard } from './InProgressCard';
import { CompletedCard } from './CompletedCard';
import { ActionButtons } from './ActionButtons';
import { Container, Stack, SlideIn } from '@/components/design-system';

export function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const ticketIdFromParams = id ? parseInt(id, 10) : null;
  const { ticket, isLoading, error } = useTicketStatus(ticketIdFromParams);
  const { data: queueData } = useQueue(3000);
  const [shareSuccess, setShareSuccess] = useState(false);
  const { barber, isLeaving, handleLeaveQueue, handleShareTicket } = useStatusDisplay(ticket);

  // Calculate position info
  const positionInfo = (() => {
    if (!ticket || ticket.status !== 'waiting' || !queueData) return null;
    const waitingTickets = queueData.tickets.filter((t) => t.status === 'waiting');
    const aheadCount = waitingTickets.filter((t) => t.position < ticket.position).length;
    return {
      position: ticket.position,
      ahead: aheadCount,
      total: waitingTickets.length,
    };
  })();

  const handleShare = async () => {
    if (!ticketIdFromParams) return;
    const success = await handleShareTicket(ticketIdFromParams);
    if (success) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
        <Navigation />
        <Container className="relative z-10 pt-20 sm:pt-24 pb-12">
          <div className="text-center space-y-4">
            <p className="text-[rgba(255,255,255,0.7)]">Nenhum ticket ID fornecido</p>
            <Link to="/home">
              <button className="px-4 py-2 bg-transparent text-[rgba(255,255,255,0.7)] border-2 border-[rgba(255,255,255,0.3)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all min-h-[52px]">
                Voltar ao Início
              </button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
        <Navigation />
        <Container className="relative z-10 pt-20 sm:pt-24 pb-12">
          <LoadingSpinner size="lg" text="Carregando status do ticket..." />
        </Container>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
        <Navigation />
        <Container className="relative z-10 pt-20 sm:pt-24 pb-12">
          <ErrorDisplay
            error={error || new Error('Ticket não encontrado')}
            onRetry={() => window.location.reload()}
          />
          <div className="mt-4">
            <Link to="/home">
              <button className="w-full px-4 py-2 bg-transparent text-[rgba(255,255,255,0.7)] border-2 border-[rgba(255,255,255,0.3)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all min-h-[52px]">
                Voltar ao Início
              </button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const isWaiting = ticket.status === 'waiting';
  const isInProgress = ticket.status === 'in_progress';
  const isCompleted = ticket.status === 'completed';
  const waitTime = ticket.estimatedWaitTime ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.03)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />
      <Navigation />

      <Container className="relative z-10 pt-24 sm:pt-20 lg:pt-24 pb-20 lg:pb-24">
        {/* Mobile: Stacked layout */}
        <div className="lg:hidden space-y-6 sm:space-y-8">
          <StatusHeader customerName={ticket.customerName} status={ticket.status} />

          {isWaiting && (
            <WaitingCard
              waitTime={waitTime}
              position={positionInfo?.position}
              total={positionInfo?.total}
              ahead={positionInfo?.ahead}
            />
          )}

          {isInProgress && <InProgressCard barberName={barber?.name} />}

          {isCompleted && <CompletedCard barberName={barber?.name} />}

          <ActionButtons
            status={ticket.status}
            ticketId={ticket.id}
            onLeaveQueue={handleLeaveQueue}
            isLeaving={isLeaving}
            onShare={handleShare}
          />

          {shareSuccess && (
            <SlideIn direction="up">
              <div className="fixed bottom-24 left-4 right-4 bg-[#22c55e] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
                <span className="material-symbols-outlined">check_circle</span>
                <span>Link copiado para a área de transferência!</span>
              </div>
            </SlideIn>
          )}
        </div>

        {/* Desktop: Side-by-side layout */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-start">
          <Stack spacing="xl">
            <StatusHeader customerName={ticket.customerName} status={ticket.status} />

            {isWaiting && (
              <WaitingCard
                waitTime={waitTime}
                position={positionInfo?.position}
                total={positionInfo?.total}
                ahead={positionInfo?.ahead}
              />
            )}

            {isInProgress && <InProgressCard barberName={barber?.name} />}

            {isCompleted && <CompletedCard barberName={barber?.name} />}
          </Stack>

          <div className="sticky top-24">
            <ActionButtons
              status={ticket.status}
              ticketId={ticket.id}
              onLeaveQueue={handleLeaveQueue}
              isLeaving={isLeaving}
              onShare={handleShare}
            />
          </div>
        </div>

        {shareSuccess && (
          <SlideIn direction="up">
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#22c55e] text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-2 z-50">
              <span className="material-symbols-outlined">check_circle</span>
              <span>Link copiado para a área de transferência!</span>
            </div>
          </SlideIn>
        )}
      </Container>
    </div>
  );
}
