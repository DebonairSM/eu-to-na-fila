import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useTicketStatus } from '@/hooks/useTicketStatus';
import { useQueue } from '@/hooks/useQueue';
import { useServices } from '@/hooks/useServices';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';
import { useStatusDisplay } from './hooks/useStatusDisplay';
import { StatusHeader } from './StatusHeader';
import { WaitingCard } from './WaitingCard';
import { InProgressCard } from './InProgressCard';
import { CompletedCard } from './CompletedCard';
import { ActionButtons } from './ActionButtons';
import { Container, SlideIn } from '@/components/design-system';

export function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const ticketIdFromParams = id ? parseInt(id, 10) : null;
  const { ticket, isLoading, error, refetch } = useTicketStatus(ticketIdFromParams);
  const { data: queueData } = useQueue(3000);
  const { getServiceById } = useServices();
  const [shareSuccess, setShareSuccess] = useState(false);
  const { config: shopConfig } = useShopConfig();
  const { barber, isLeaving, handleLeaveQueue, handleShareTicket, leaveError, clearLeaveError } = useStatusDisplay(ticket);

  const serviceName =
    ticket?.service?.name ??
    (ticket ? getServiceById(ticket.serviceId)?.name : null) ??
    null;

  // Memoize position calculation to avoid expensive recalculation on every render
  const positionInfo = useMemo(() => {
    if (!ticket || ticket.status !== 'waiting' || !queueData) return null;
    const waitingTickets = queueData.tickets.filter((t) => t.status === 'waiting');
    // Sort waiting tickets by position (or createdAt as fallback) to ensure correct order
    const sortedWaitingTickets = [...waitingTickets].sort((a, b) => {
      // First try to sort by position
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      // If positions are equal or invalid, sort by creation time
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    const ticketIndex = sortedWaitingTickets.findIndex((t) => t.id === ticket.id);
    const calculatedPosition = ticketIndex >= 0 ? ticketIndex + 1 : ticket.position;
    // Calculate ahead count based on sorted order, not position comparison
    const aheadCount = ticketIndex >= 0 ? ticketIndex : sortedWaitingTickets.filter((t) => new Date(t.createdAt).getTime() < new Date(ticket.createdAt).getTime()).length;
    return {
      position: calculatedPosition,
      ahead: aheadCount,
      total: waitingTickets.length,
    };
  }, [ticket, queueData]);

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
      <div className="min-h-screen bg-[var(--shop-background)]">
        <Navigation />
        <Container className="pt-24 pb-12">
          <div className="text-center space-y-4">
            <p className="text-[var(--shop-text-secondary)]">{t('status.ticketNotFound')}</p>
            <Link to="/home">
              <button className="px-4 py-2 bg-transparent text-[var(--shop-text-secondary)] border border-[var(--shop-border-color)] rounded-lg hover:border-[var(--shop-accent)] hover:text-[var(--shop-accent)] transition-colors min-h-[52px]">
                {t('status.backHome')}
              </button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--shop-background)]">
        <Navigation />
        <Container className="pt-24 pb-12">
          <LoadingSpinner size="lg" text={t('common.loading')} />
        </Container>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-[var(--shop-background)]">
        <Navigation />
        <Container className="pt-24 pb-12">
          <ErrorDisplay
            error={error || new Error(t('status.ticketNotFound'))}
            onRetry={() => {
              if (ticketIdFromParams) {
                refetch();
              } else {
                navigate('/home');
              }
            }}
          />
          <div className="mt-4">
            <Link to="/home">
              <button className="w-full px-4 py-2 bg-transparent text-[var(--shop-text-secondary)] border border-[var(--shop-border-color)] rounded-lg hover:border-[var(--shop-accent)] hover:text-[var(--shop-accent)] transition-colors min-h-[52px]">
                {t('status.backHome')}
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
  const canCancel =
    ticket.status === 'waiting' ||
    (ticket.status === 'in_progress' && shopConfig.settings.allowCustomerCancelInProgress);

  return (
    <div className="min-h-screen bg-[var(--shop-background)] status-page">
      <Navigation />

      <Container className="pt-24 pb-20">
        <div className="lg:hidden space-y-8">
          <StatusHeader customerName={ticket.customerName} status={ticket.status} serviceName={serviceName} ticketNumber={(ticket as { ticketNumber?: string | null }).ticketNumber} scheduledTime={(ticket as { scheduledTime?: string | null }).scheduledTime} />

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
            canCancel={canCancel}
            onLeaveQueue={handleLeaveQueue}
            isLeaving={isLeaving}
            leaveError={leaveError}
            onDismissLeaveError={clearLeaveError}
            onShare={handleShare}
          />

          {shareSuccess && (
            <SlideIn direction="up">
              <div className="fixed bottom-24 left-4 right-4 bg-white text-black px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
                <span className="material-symbols-outlined">check_circle</span>
                <span>{t('status.shareSuccess')}</span>
              </div>
            </SlideIn>
          )}
        </div>

        <div className="hidden lg:block">
          <div className="max-w-2xl mx-auto space-y-10">
            <StatusHeader customerName={ticket.customerName} status={ticket.status} serviceName={serviceName} ticketNumber={(ticket as { ticketNumber?: string | null }).ticketNumber} scheduledTime={(ticket as { scheduledTime?: string | null }).scheduledTime} />

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
              canCancel={canCancel}
              onLeaveQueue={handleLeaveQueue}
              isLeaving={isLeaving}
              leaveError={leaveError}
              onDismissLeaveError={clearLeaveError}
              onShare={handleShare}
            />
          </div>
        </div>

        {shareSuccess && (
          <SlideIn direction="up">
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-4 rounded-lg shadow-lg flex items-center gap-2 z-50">
              <span className="material-symbols-outlined">check_circle</span>
              <span>{t('status.shareSuccess')}</span>
            </div>
          </SlideIn>
        )}
      </Container>
    </div>
  );
}
