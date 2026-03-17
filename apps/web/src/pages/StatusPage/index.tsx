import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { useTicketStatus } from '@/hooks/useTicketStatus';
import { useQueue } from '@/hooks/useQueue';
import { useServices } from '@/hooks/useServices';
import { useShopConfig, useShopHomeContent } from '@/contexts/ShopConfigContext';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useBarbers } from '@/hooks/useBarbers';
import { api, ApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';
import { useStatusDisplay } from './hooks/useStatusDisplay';
import { StatusHeader } from './StatusHeader';
import { WaitingCard, type WaitingMilestone } from './WaitingCard';
import { InProgressCard } from './InProgressCard';
import { CompletedCard } from './CompletedCard';
import { ActionButtons } from './ActionButtons';
import { Modal } from '@/components/Modal';
import { RefreshButton } from '@/components/RefreshButton';
import { Button, InputLabel } from '@/components/design-system';
import { Container, SlideIn } from '@/components/design-system';
import { hasHoursForDay } from '@/lib/operatingHours';
import { POLL_INTERVALS } from '@/lib/constants';

export function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const shopSlug = useShopSlug();
  const ticketIdFromParams = id ? parseInt(id, 10) : null;
  const { ticket, isLoading, error, refetch } = useTicketStatus(ticketIdFromParams);
  const { data: queueData } = useQueue(POLL_INTERVALS.STATUS_PAGE_QUEUE);
  const { getServiceById } = useServices();
  const { barbers } = useBarbers();
  const [shareSuccess, setShareSuccess] = useState(false);
  const [generalLineWaitTime, setGeneralLineWaitTime] = useState<number | null>(null);
  const { config: shopConfig } = useShopConfig();
  const homeContent = useShopHomeContent();
  const { user, isCustomer } = useAuthContext();
  const location = useLocation();
  const linkToAccountHref =
    ticket && !isCustomer
      ? `/shop/login?redirect=${encodeURIComponent(location.pathname)}`
      : null;
  const { barber, isLeaving, handleLeaveQueue, handleShareTicket, leaveError, clearLeaveError } = useStatusDisplay(ticket);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInCooldownUntil, setCheckInCooldownUntil] = useState<number | null>(null);
  const [checkInCooldownRemaining, setCheckInCooldownRemaining] = useState(0);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleSlotTime, setRescheduleSlotTime] = useState<string | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [showYouMovedUp, setShowYouMovedUp] = useState(false);
  const prevPositionRef = useRef<number | null>(null);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, isRefreshing]);

  const preferredBarberId = (ticket as { preferredBarberId?: number | null } | null)?.preferredBarberId ?? null;
  const preferredBarberName = preferredBarberId != null ? barbers.find((b) => b.id === preferredBarberId)?.name ?? null : null;

  // Enforce per-barbershop status: if ticket belongs to another shop, redirect to that shop's status URL
  const ticketShopSlug = (ticket as { shopSlug?: string } | null)?.shopSlug;
  useEffect(() => {
    if (isLoading || !ticket || !ticketShopSlug || ticketShopSlug === shopSlug) return;
    const basePath =
      ticketShopSlug === shopSlug
        ? (typeof window !== 'undefined' && (window as unknown as { __SHOP_PATH__?: string }).__SHOP_PATH__?.replace(/\/+$/, '')) || `/${ticketShopSlug}`
        : `/${ticketShopSlug}`;
    window.location.assign(`${basePath}/status/${ticket.id}`);
  }, [isLoading, ticket, ticketShopSlug, shopSlug]);

  // Poll general-line wait time at most once per 20 seconds when waiting with a preferred barber
  const WAIT_TIME_POLL_MS = 20000;
  const lastWaitTimeFetchAtRef = useRef(0);
  useEffect(() => {
    if (!shopSlug || ticket?.status !== 'waiting' || preferredBarberId == null) {
      setGeneralLineWaitTime(null);
      return;
    }
    let cancelled = false;
    let intervalId: number | null = null;

    const fetchWaitTime = () => {
      if (cancelled || document.hidden) return;
      const now = Date.now();
      if (now - lastWaitTimeFetchAtRef.current < WAIT_TIME_POLL_MS) return;
      lastWaitTimeFetchAtRef.current = now;
      api.getWaitTimes(shopSlug).then((res) => {
        if (!cancelled) setGeneralLineWaitTime(res.standardWaitTime ?? null);
      }).catch(() => {
        if (!cancelled) setGeneralLineWaitTime(null);
      });
    };

    const startPolling = () => {
      if (intervalId) return;
      fetchWaitTime();
      intervalId = window.setInterval(fetchWaitTime, WAIT_TIME_POLL_MS);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();
    const onVisibilityChange = () => (document.hidden ? stopPolling() : startPolling());
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [shopSlug, ticket?.status, preferredBarberId]);

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

  const waitingMilestone: WaitingMilestone = useMemo(() => {
    if (!ticket || ticket.status !== 'waiting') return null;
    const wt = ticket.estimatedWaitTime ?? null;
    if (wt !== null && wt <= 0) return 'your_turn';
    if (wt !== null && wt <= 2 && wt > 0) return 'almost_there';
    if (positionInfo?.position === 1 && (positionInfo?.total ?? 0) >= 1) return 'first_in_line';
    return null;
  }, [ticket?.status, ticket?.estimatedWaitTime, positionInfo?.position, positionInfo?.total]);

  useEffect(() => {
    const pos = positionInfo?.position;
    if (pos == null) return;
    const prev = prevPositionRef.current;
    prevPositionRef.current = pos;
    if (prev != null && pos < prev) {
      setShowYouMovedUp(true);
      const t = setTimeout(() => setShowYouMovedUp(false), 4000);
      return () => clearTimeout(t);
    }
  }, [positionInfo?.position]);

  const handleShare = async () => {
    if (!ticketIdFromParams) return;
    const success = await handleShareTicket(ticketIdFromParams);
    if (success) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    }
  };

  const ticketClientId = (ticket as { clientId?: number | null })?.clientId ?? null;
  const ticketType = (ticket as { type?: string })?.type ?? 'walkin';
  const canCheckInAsClient =
    ticket?.status === 'pending' &&
    ticketType === 'appointment' &&
    user?.role === 'customer' &&
    user?.clientId != null &&
    ticketClientId === user.clientId;

  const handleCheckIn = useCallback(async () => {
    if (!shopSlug || !ticketIdFromParams) return;
    setCheckInError(null);
    setIsCheckingIn(true);
    try {
      await api.checkInAppointment(shopSlug, ticketIdFromParams);
      await refetch();
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 429) {
        setCheckInCooldownUntil(Date.now() + 20000);
      }
      setCheckInError(getErrorMessage(error, t('barber.checkInError')));
    } finally {
      setIsCheckingIn(false);
    }
  }, [shopSlug, ticketIdFromParams, refetch, t]);

  useEffect(() => {
    if (checkInCooldownUntil == null) {
      setCheckInCooldownRemaining(0);
      return;
    }
    const tick = () => {
      const remaining = Math.ceil((checkInCooldownUntil - Date.now()) / 1000);
      setCheckInCooldownRemaining(remaining <= 0 ? 0 : remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [checkInCooldownUntil]);

  const settings = shopConfig.settings;
  const showRatingPrompt = settings?.showRatingPrompt !== false;
  const operatingHours = settings?.operatingHours as Record<string, { open?: string; close?: string } | null> | undefined;

  const handleRate = useCallback(
    async (rating: number) => {
      const ticketId = ticket?.id ?? ticketIdFromParams;
      if (ticketId == null || isRatingSubmitting) return;
      setRatingError(null);
      setIsRatingSubmitting(true);
      try {
        await api.submitRating(ticketId, rating);
        await refetch();
      } catch (err) {
        setRatingError(getErrorMessage(err, t('status.rateError')));
      } finally {
        setIsRatingSubmitting(false);
      }
    },
    [ticket?.id, ticketIdFromParams, isRatingSubmitting, refetch, t]
  );

  const ticketRating = (ticket as { rating?: number } | null)?.rating;
  const timezone = settings?.timezone ?? 'America/Sao_Paulo';

  const rescheduleDateStr = rescheduleDate
    ? `${rescheduleDate.getFullYear()}-${String(rescheduleDate.getMonth() + 1).padStart(2, '0')}-${String(rescheduleDate.getDate()).padStart(2, '0')}`
    : '';

  useEffect(() => {
    if (!rescheduleModalOpen || !ticket) return;
    const st = (ticket as { scheduledTime?: string | null }).scheduledTime;
    if (st) {
      const zoned = toZonedTime(new Date(st), timezone);
      setRescheduleDate(new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate()));
      setRescheduleSlotTime(`${String(zoned.getHours()).padStart(2, '0')}:${String(zoned.getMinutes()).padStart(2, '0')}`);
    } else {
      const today = new Date();
      setRescheduleDate(today);
      setRescheduleSlotTime(null);
    }
    setRescheduleError(null);
  }, [rescheduleModalOpen, ticket, timezone]);

  const ticketServiceIds = ticket
    ? (ticket.complementaryServiceIds && ticket.complementaryServiceIds.length > 0
        ? ticket.complementaryServiceIds
        : [ticket.serviceId])
    : [];
  useEffect(() => {
    if (!rescheduleModalOpen || !shopSlug || !rescheduleDateStr || ticketServiceIds.length === 0) {
      setRescheduleSlots([]);
      return;
    }
    setRescheduleSlotsLoading(true);
    api
      .getAppointmentSlots(shopSlug, rescheduleDateStr, ticketServiceIds, preferredBarberId ?? undefined)
      .then((res) => setRescheduleSlots(res.slots))
      .catch(() => setRescheduleSlots([]))
      .finally(() => setRescheduleSlotsLoading(false));
  }, [rescheduleModalOpen, shopSlug, rescheduleDateStr, ticketServiceIds.join(','), preferredBarberId]);

  useEffect(() => {
    setRescheduleSlotTime(null);
  }, [rescheduleDate]);

  const rescheduleDisabledDays = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    return !hasHoursForDay(operatingHours, date);
  }, [operatingHours]);

  const handleRescheduleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketIdFromParams || !rescheduleDate || !rescheduleSlotTime) return;
    setRescheduleError(null);
    setRescheduleSubmitting(true);
    try {
      const localDateTime = `${rescheduleDateStr}T${rescheduleSlotTime}:00`;
      const utcDate = fromZonedTime(localDateTime, timezone);
      await api.rescheduleAppointment(ticketIdFromParams, utcDate.toISOString());
      await refetch();
      setRescheduleModalOpen(false);
    } catch (error) {
      setRescheduleError(getErrorMessage(error, t('barber.appointmentRescheduleError')));
    } finally {
      setRescheduleSubmitting(false);
    }
  }, [ticketIdFromParams, rescheduleDate, rescheduleSlotTime, rescheduleDateStr, timezone, refetch, t]);

  const handleOpenReschedule = useCallback(() => {
    setRescheduleModalOpen(true);
  }, []);

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
  const generalLineFaster =
    isWaiting &&
    waitTime != null &&
    generalLineWaitTime != null &&
    generalLineWaitTime < waitTime;
  const isPendingAppointment =
    ticket.status === 'pending' && ticketType === 'appointment';
  const canCancel =
    isPendingAppointment ||
    ticket.status === 'waiting' ||
    (ticket.status === 'in_progress' && shopConfig.settings.allowCustomerCancelInProgress);

  const showGuestBanner = ticket && !isCustomer && (ticket.status === 'waiting' || ticket.status === 'in_progress') && linkToAccountHref;

  return (
    <div className="min-h-screen bg-[var(--shop-background)] status-page">
      <Navigation />

      <Container className="pt-24 pb-20">
        {showGuestBanner && (
          <div className="mb-6 rounded-lg border border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--shop-accent)_8%,transparent)] px-4 py-3 text-center">
            <Link to={linkToAccountHref!} className="text-sm text-[var(--shop-accent)] hover:underline">
              {t('status.signInForReminders')}
            </Link>
          </div>
        )}
        <div className="lg:hidden space-y-8">
          <StatusHeader customerName={ticket.customerName} status={ticket.status} serviceName={serviceName} ticketNumber={(ticket as { ticketNumber?: string | null }).ticketNumber} scheduledTime={(ticket as { scheduledTime?: string | null }).scheduledTime} />

          {isWaiting && (
            <>
              <WaitingCard
                waitTime={waitTime}
                position={positionInfo?.position}
                total={positionInfo?.total}
                ahead={positionInfo?.ahead}
                preferredBarberName={preferredBarberName ?? undefined}
                generalLineWaitTime={generalLineFaster ? generalLineWaitTime ?? undefined : undefined}
                milestone={waitingMilestone}
              />
              {showYouMovedUp && (
                <div className="text-center py-2 text-[var(--shop-accent)] text-sm font-medium animate-in fade-in duration-300">
                  {t('status.youMovedUp')}
                </div>
              )}
              {homeContent.waitingTip?.trim() && (
                <div className="text-center py-3 px-4 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
                  <p className="text-sm text-[var(--shop-text-secondary)]">{homeContent.waitingTip.trim()}</p>
                </div>
              )}
              <div className="flex justify-center -mt-2">
                <RefreshButton
                  isRefreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  ariaLabel={t('status.refresh')}
                  label={t('status.refresh')}
                />
              </div>
            </>
          )}

          {isInProgress && (
            <>
              <InProgressCard barberName={barber?.name} />
              <div className="flex justify-center -mt-2">
                <RefreshButton
                  isRefreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  ariaLabel={t('status.refresh')}
                  label={t('status.refresh')}
                />
              </div>
            </>
          )}

          {isCompleted && (
            <>
              <CompletedCard
                barberName={barber?.name}
                rating={ticketRating}
                onRate={showRatingPrompt ? handleRate : undefined}
                isRatingSubmitting={isRatingSubmitting}
                ratingError={ratingError}
              />
              <div className="flex justify-center -mt-2">
                <RefreshButton
                  isRefreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  ariaLabel={t('status.refresh')}
                  label={t('status.refresh')}
                />
              </div>
            </>
          )}

          <ActionButtons
            status={ticket.status}
            ticketId={ticket.id}
            canCancel={canCancel}
            onLeaveQueue={handleLeaveQueue}
            isLeaving={isLeaving}
            leaveError={checkInError ?? leaveError}
            onDismissLeaveError={() => { setCheckInError(null); clearLeaveError(); }}
            onShare={handleShare}
            showCheckIn={canCheckInAsClient}
            onCheckIn={handleCheckIn}
            isCheckingIn={isCheckingIn}
            checkInCooldownRemaining={checkInCooldownRemaining}
            isPendingAppointment={isPendingAppointment}
            onEditAppointment={handleOpenReschedule}
            linkToAccountHref={linkToAccountHref}
          />
        </div>

        <div className="hidden lg:block">
          <div className="max-w-2xl mx-auto space-y-10">
            <StatusHeader customerName={ticket.customerName} status={ticket.status} serviceName={serviceName} ticketNumber={(ticket as { ticketNumber?: string | null }).ticketNumber} scheduledTime={(ticket as { scheduledTime?: string | null }).scheduledTime} />

            {isWaiting && (
              <>
                <WaitingCard
                  waitTime={waitTime}
                  position={positionInfo?.position}
                  total={positionInfo?.total}
                  ahead={positionInfo?.ahead}
                  preferredBarberName={preferredBarberName ?? undefined}
                  generalLineWaitTime={generalLineFaster ? generalLineWaitTime ?? undefined : undefined}
                  milestone={waitingMilestone}
                />
                {showYouMovedUp && (
                  <div className="text-center py-2 text-[var(--shop-accent)] text-sm font-medium animate-in fade-in duration-300">
                    {t('status.youMovedUp')}
                  </div>
                )}
                {homeContent.waitingTip?.trim() && (
                  <div className="text-center py-3 px-4 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
                    <p className="text-sm text-[var(--shop-text-secondary)]">{homeContent.waitingTip.trim()}</p>
                  </div>
                )}
                <div className="flex justify-center -mt-2">
                  <RefreshButton
                    isRefreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    ariaLabel={t('status.refresh')}
                    label={t('status.refresh')}
                  />
                </div>
              </>
            )}

            {isInProgress && (
              <>
                <InProgressCard barberName={barber?.name} />
                <div className="flex justify-center -mt-2">
                  <RefreshButton
                    isRefreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    ariaLabel={t('status.refresh')}
                    label={t('status.refresh')}
                  />
                </div>
              </>
            )}

            {isCompleted && (
              <>
                <CompletedCard
                  barberName={barber?.name}
                  rating={ticketRating}
                  onRate={showRatingPrompt ? handleRate : undefined}
                  isRatingSubmitting={isRatingSubmitting}
                  ratingError={ratingError}
                />
                <div className="flex justify-center -mt-2">
                  <RefreshButton
                    isRefreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    ariaLabel={t('status.refresh')}
                    label={t('status.refresh')}
                  />
                </div>
              </>
            )}

            <ActionButtons
              status={ticket.status}
              ticketId={ticket.id}
              canCancel={canCancel}
              onLeaveQueue={handleLeaveQueue}
              isLeaving={isLeaving}
              leaveError={checkInError ?? leaveError}
              onDismissLeaveError={() => { setCheckInError(null); clearLeaveError(); }}
              onShare={handleShare}
              showCheckIn={canCheckInAsClient}
              onCheckIn={handleCheckIn}
              isCheckingIn={isCheckingIn}
              checkInCooldownRemaining={checkInCooldownRemaining}
              isPendingAppointment={isPendingAppointment}
              onEditAppointment={handleOpenReschedule}
              linkToAccountHref={linkToAccountHref}
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

        <Modal
          isOpen={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          title={t('barber.rescheduleAppointment')}
          showCloseButton
        >
          <form onSubmit={handleRescheduleSubmit} className="space-y-4">
            <div>
              <InputLabel className="mb-2 block">{t('schedule.selectDate')}</InputLabel>
              <div className="schedule-calendar-wrap w-full overflow-x-auto">
                <DayPicker
                  mode="single"
                  selected={rescheduleDate}
                  onSelect={(d) => setRescheduleDate(d)}
                  disabled={rescheduleDisabledDays}
                  className="rdp-default w-full bg-muted/30 rounded-lg p-2 [--rdp-accent-color:var(--shop-accent)]"
                />
              </div>
            </div>
            {rescheduleDateStr && ticketServiceIds.length > 0 && (
              <div>
                <InputLabel className="mb-2 block">{t('schedule.selectTime')}</InputLabel>
                {rescheduleSlotsLoading ? (
                  <p className="text-sm text-[var(--shop-text-secondary)]">{t('common.loading')}</p>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-sm text-[var(--shop-text-secondary)]">{t('schedule.noSlots')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {rescheduleSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setRescheduleSlotTime(slot.time)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          rescheduleSlotTime === slot.time
                            ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                            : slot.available
                              ? 'bg-white/10 hover:bg-white/20 text-white'
                              : 'bg-white/5 text-white/40 cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {rescheduleError && (
              <p className="text-sm text-[#ef4444]">{rescheduleError}</p>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRescheduleModalOpen(false)}
                className="flex-1"
              >
                {t('status.confirmLeaveCancel')}
              </Button>
              <Button
                type="submit"
                disabled={rescheduleSubmitting || !rescheduleDate || !rescheduleSlotTime}
                className="flex-1"
              >
                {rescheduleSubmitting ? t('barber.rescheduling') : t('barber.reschedule')}
              </Button>
            </div>
          </form>
        </Modal>
      </Container>
    </div>
  );
}
