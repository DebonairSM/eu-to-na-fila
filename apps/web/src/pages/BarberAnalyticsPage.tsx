import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { BarberServiceWeekdayStatsTable } from '@/components/BarberServiceWeekdayStatsTable';
import { Container, Heading, Text, Card, CardContent } from '@/components/design-system';
import { useLocale } from '@/contexts/LocaleContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { formatCurrency, formatDate } from '@/lib/format';
import type { BarberServiceHistoryResponse } from '@/lib/api/analytics';

interface BarberAnalyticsData {
  period: { days: number; since: string; until: string };
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    completionRate: number;
    cancellationRate: number;
    avgPerDay: number;
    avgServiceTime: number;
    revenueCents: number;
  };
  ticketsByDay: Record<string, number>;
  serviceBreakdown: Array<{ serviceId: number; serviceName: string; count: number; percentage: number; revenueCents?: number }>;
  dayOfWeekDistribution: Record<string, number>;
  serviceTimeByWeekday?: Array<{
    serviceId: number;
    serviceName: string;
    dayOfWeek: number;
    dayName: string;
    avgDurationMinutes: number;
    totalCompleted: number;
  }>;
  ratings?: {
    ratingCount: number;
    avgRating: number | null;
    ratingsToday: { count: number; avg: number | null; byStar: number[] };
  };
}

export function BarberAnalyticsPage() {
  const shopSlug = useShopSlug();
  const { config: shopConfig } = useShopConfig();
  const { isBarber, user } = useAuthContext();
  const { locale, t } = useLocale();
  const navigate = useNavigate();
  const canSeeProfits = shopConfig.settings?.barbersCanSeeProfits !== false;
  const [days, setDays] = useState(30);
  const [data, setData] = useState<BarberAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [myHistory, setMyHistory] = useState<BarberServiceHistoryResponse | null>(null);
  const [myHistoryPage, setMyHistoryPage] = useState(1);
  const [myHistoryLoading, setMyHistoryLoading] = useState(false);

  if (!isBarber) {
    navigate(user?.role === 'owner' ? '/owner' : '/manage', { replace: true });
    return null;
  }

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.getBarberAnalytics(shopSlug, days);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(t('barber.loadStatsError')));
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [days, shopSlug, t]);

  useEffect(() => {
    if (!shopSlug) return;
    let cancelled = false;
    setMyHistoryLoading(true);
    api
      .getMyBarberServiceHistory(shopSlug, { page: myHistoryPage, limit: 25 })
      .then((res) => {
        if (!cancelled) setMyHistory(res);
      })
      .catch(() => {
        if (!cancelled) setMyHistory(null);
      })
      .finally(() => {
        if (!cancelled) setMyHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopSlug, myHistoryPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--shop-background)]">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh] pt-24">
          <LoadingSpinner size="lg" text={t('barber.loadingPerformance')} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--shop-background)]">
        <Navigation />
        <Container className="pt-24 pb-12">
          <ErrorDisplay error={error ?? new Error(t('barber.dataUnavailable'))} />
        </Container>
      </div>
    );
  }

  const { summary, ticketsByDay, serviceBreakdown, dayOfWeekDistribution, serviceTimeByWeekday, ratings } = data;
  const daysList = Object.entries(ticketsByDay).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="min-h-screen bg-[var(--shop-background)]">
      <Navigation />
      <Container className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Heading level={1} className="text-2xl sm:text-3xl text-white">
              Meu desempenho
            </Heading>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="select-readable px-3 py-2 rounded-lg bg-white border border-white/20 text-gray-900 text-sm"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={14}>Últimos 14 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
          </div>

          <div className={`grid gap-4 ${canSeeProfits ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
            <Card variant="default" className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <Text size="sm" variant="secondary" className="uppercase tracking-wider">
                  Atendimentos
                </Text>
                <p className="text-2xl font-bold text-[var(--shop-accent)] mt-1">{summary.completed}</p>
              </CardContent>
            </Card>
            {canSeeProfits && (
              <Card variant="default" className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <Text size="sm" variant="secondary" className="uppercase tracking-wider">
                    Faturamento
                  </Text>
                  <p className="text-2xl font-bold text-[var(--shop-accent)] mt-1">{formatCurrency(summary.revenueCents, locale)}</p>
                </CardContent>
              </Card>
            )}
            <Card variant="default" className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <Text size="sm" variant="secondary" className="uppercase tracking-wider">
                  Média/dia
                </Text>
                <p className="text-2xl font-bold text-white mt-1">{summary.avgPerDay}</p>
              </CardContent>
            </Card>
            <Card variant="default" className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <Text size="sm" variant="secondary" className="uppercase tracking-wider">
                  Tempo médio (min)
                </Text>
                <p className="text-2xl font-bold text-white mt-1">{summary.avgServiceTime}</p>
              </CardContent>
            </Card>
            {ratings && (ratings.ratingCount > 0 || ratings.ratingsToday.count > 0) && (
              <Card variant="default" className="bg-white/5 border-white/10 sm:col-span-2">
                <CardContent className="p-4">
                  <Text size="sm" variant="secondary" className="uppercase tracking-wider">
                    {t('analytics.ratings')}
                  </Text>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <span
                          key={value}
                          className={`material-symbols-outlined text-xl ${ratings.avgRating != null && value <= Math.round(ratings.avgRating) ? 'text-[var(--shop-accent)]' : 'text-white/30'}`}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-xl font-bold text-[var(--shop-accent)]">
                      {ratings.avgRating != null ? ratings.avgRating.toFixed(1) : '—'}
                    </span>
                    <span className="text-white/70 text-sm">({ratings.ratingCount})</span>
                    {ratings.ratingsToday.count > 0 && (
                      <span className="text-white/60 text-sm">
                        · {ratings.ratingsToday.count} {t('barberDashboard.today')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card variant="default" className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <Heading level={2} className="text-lg text-white mb-4">
                {t('barber.attendancesByDay')}
              </Heading>
              {daysList.length === 0 ? (
                <Text variant="secondary">{t('barber.noAttendanceInPeriod')}</Text>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {daysList.map(([day, count]) => (
                    <li key={day} className="flex justify-between text-sm">
                      <span className="text-white/80">
                        {formatDate(new Date(`${day}T12:00:00.000Z`), locale, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </span>
                      <span className="text-[var(--shop-accent)] font-medium">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card variant="default" className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <Heading level={2} className="text-lg text-white mb-4">
                {t('barber.byService')}
              </Heading>
              {serviceBreakdown.length === 0 ? (
                <Text variant="secondary">{t('barber.noDataInPeriod')}</Text>
              ) : (
                <ul className="space-y-3">
                  {serviceBreakdown.map((s) => (
                    <li key={s.serviceId} className="flex justify-between items-center gap-3 text-sm flex-wrap">
                      <span className="text-white/90">{s.serviceName}</span>
                      <span className="text-[var(--shop-accent)] font-medium flex items-center gap-2">
                        {s.count} ({s.percentage}%)
                        {canSeeProfits && s.revenueCents != null && s.revenueCents > 0 && (
                          <span className="text-white/80 font-normal">
                            {formatCurrency(s.revenueCents, locale)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card variant="default" className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <Heading level={2} className="text-lg text-white mb-4">
                Por dia da semana
              </Heading>
              <ul className="space-y-2">
                {Object.entries(dayOfWeekDistribution).map(([day, count]) => (
                  <li key={day} className="flex justify-between text-sm">
                    <span className="text-white/80">{day}</span>
                    <span className="text-white font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {serviceTimeByWeekday && serviceTimeByWeekday.length > 0 && (
            <Card variant="default" className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <Heading level={2} className="text-lg text-white mb-2">
                  {t('analytics.myTimeByWeekdayTitle')}
                </Heading>
                <Text size="sm" variant="secondary" className="mb-4 block">
                  {t('analytics.myTimeByWeekdayIntro')}
                </Text>
                <BarberServiceWeekdayStatsTable
                  rows={serviceTimeByWeekday}
                  showBarberColumn={false}
                  emptyMessage={t('barber.noDataInPeriod')}
                  labelBarber={t('analytics.barber')}
                  labelDay={t('analytics.day')}
                  labelService={t('analytics.service')}
                  labelAvgMinutes={t('analytics.avgMin')}
                  labelAttendances={t('analytics.attendances')}
                />
              </CardContent>
            </Card>
          )}

          <Card variant="default" className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <Heading level={2} className="text-lg text-white mb-4">
                {t('analytics.serviceHistory')}
              </Heading>
              {myHistoryLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : myHistory && myHistory.tickets.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="text-white/50 border-b border-white/10">
                          <th className="py-2 pr-4">{t('analytics.historyDate')}</th>
                          <th className="py-2 pr-4">{t('analytics.historyClient')}</th>
                          <th className="py-2 pr-4">{t('analytics.service')}</th>
                          <th className="py-2 pr-4">{t('analytics.historyStatus')}</th>
                          <th className="py-2 text-right">{t('analytics.historyDuration')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myHistory.tickets.map((ticket) => (
                          <tr key={ticket.id} className="border-b border-white/5">
                            <td className="py-2 pr-4 text-white/80">
                              {formatDate(new Date(ticket.createdAt), locale, { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="py-2 pr-4 text-white/90">{ticket.clientDisplayName}</td>
                            <td className="py-2 pr-4 text-white/90">
                              {(ticket.serviceNames?.length ? ticket.serviceNames : [ticket.serviceName]).join(' · ')}
                            </td>
                            <td className="py-2 pr-4 text-white/80">{ticket.status}</td>
                            <td className="py-2 text-right text-[var(--shop-accent)]">
                              {ticket.durationMinutes != null ? `${ticket.durationMinutes} min` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setMyHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={myHistoryPage <= 1}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('common.back')}
                    </button>
                    <span className="text-white/70 text-sm">
                      {myHistoryPage} / {Math.ceil(myHistory.total / 25) || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMyHistoryPage((p) => p + 1)}
                      disabled={myHistoryPage * 25 >= myHistory.total}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('common.next')}
                    </button>
                  </div>
                </>
              ) : (
                <Text variant="secondary">{t('barber.noDataInPeriod')}</Text>
              )}
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}
