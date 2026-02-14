import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { DailyChart } from '@/components/DailyChart';
import { HourlyChart } from '@/components/HourlyChart';
import { AIAnalyticsAdvisor } from '@/components/AIAnalyticsAdvisor';
import { ServiceBreakdownChart } from '@/components/ServiceBreakdownChart';
import { LocationChart } from '@/components/LocationChart';
import { DemographicsInsights } from '@/components/DemographicsInsights';
import { DayOfWeekChart } from '@/components/DayOfWeekChart';
import { WaitTimeTrendChart } from '@/components/WaitTimeTrendChart';
import { CancellationChart } from '@/components/CancellationChart';
import { ServiceTimeDistributionChart } from '@/components/ServiceTimeDistributionChart';
import { TypeBreakdownChart } from '@/components/TypeBreakdownChart';
import { ClientInfoModal } from '@/components/ClientInfoModal';
import { DAY_NAMES_PT_FULL } from '@/lib/constants';
import { downloadAnalyticsPdf } from '@/lib/analyticsPdf';
import { useLocale } from '@/contexts/LocaleContext';
import { formatDate } from '@/lib/format';

interface AnalyticsData {
  period: {
    days: number;
    since: string;
    until: string;
  };
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    waiting: number;
    inProgress: number;
    completionRate: number;
    cancellationRate: number;
    avgPerDay: number;
    avgServiceTime: number;
    revenueCents?: number;
  };
  barbers: Array<{
    id: number;
    name: string;
    totalServed: number;
    avgServiceTime: number;
    isPresent: boolean;
  }>;
  ticketsByDay: Record<string, number>;
  hourlyDistribution: Record<number, number>;
  peakHour: { hour: number; count: number } | null;
  serviceBreakdown: Array<{ serviceId: number; serviceName: string; count: number; percentage: number; revenueCents?: number }>;
  dayOfWeekDistribution: Record<string, number>;
  waitTimeTrends: Record<string, number>;
  cancellationAnalysis: {
    rateByDay: Record<string, number>;
    rateByHour: Record<number, number>;
    avgTimeBeforeCancellation: number;
  };
  serviceTimeDistribution: Record<string, number>;
  barberEfficiency: Array<{
    id: number;
    name: string;
    ticketsPerDay: number;
    completionRate: number;
  }>;
  trends: {
    weekOverWeek: number;
    last7DaysComparison: Array<{ day: string; change: number }>;
  };
  revenueByDay?: Record<string, number>;
  typeBreakdown?: { walkin: number; appointment: number; walkinPercent: number; appointmentPercent: number };
  typeByDay?: Record<string, { walkin: number; appointment: number }>;
  clientMetrics?: { uniqueClients: number; newClients: number; returningClients: number; repeatRate: number };
  preferredBarberFulfillment?: { requested: number; fulfilled: number; rate: number };
  appointmentMetrics?: { total: number; noShows: number; noShowRate: number; avgMinutesLate: number; onTimeCount: number };
  demographics?: {
    locationBreakdown: { city: string; state?: string; count: number }[];
    genderBreakdown: { gender: string; count: number }[];
    ageBreakdown: { range: string; count: number }[];
    styleBreakdown: { style: string; count: number }[];
  };
  correlations?: { ruleBased: string[]; llmInsights?: string[] };
}

type AnalyticsView = 'overview' | 'time' | 'services' | 'barbers' | 'cancellations' | 'demographics' | 'clients';

export function AnalyticsPage() {
  const shopSlug = useShopSlug();
  const { config: shopConfig } = useShopConfig();
  const { isOwner } = useAuthContext();
  const { locale, t } = useLocale();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeView, setActiveView] = useState<AnalyticsView>('overview');
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsList, setClientsList] = useState<{ clients: Array<{ id: number; name: string; phone: string; email: string | null; createdAt: string; ticketCount: number }>; total: number } | null>(null);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientModalId, setClientModalId] = useState<number | null>(null);

  const formatPeriodRange = (since: string, until: string, periodDays: number): string => {
    if (periodDays === 0) return t('analytics.periodAll');
    const s = new Date(since);
    const u = new Date(until);
    return `${formatDate(s, locale)} – ${formatDate(u, locale)}`;
  };

  const periodLabel = (periodDays: number): string => {
    if (periodDays === 0) return t('analytics.periodAll');
    return `${periodDays} ${t('analytics.days')}`;
  };

  // Redirect if not owner
  if (!isOwner) {
    navigate('/staff');
    return null;
  }

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const analyticsData = await api.getAnalytics(shopSlug, days);
        setData(analyticsData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        } else if (err && typeof err === 'object' && 'error' in err) {
          setError(new Error((err as { error: string }).error));
        } else {
          setError(new Error('Erro ao carregar analytics. Tente novamente.'));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [days, shopSlug]);

  useEffect(() => {
    if (activeView !== 'clients' || !shopSlug) return;
    setClientsLoading(true);
    api
      .listClients(shopSlug, clientsPage, 24)
      .then((res) => setClientsList({ clients: res.clients, total: res.total }))
      .catch(() => setClientsList(null))
      .finally(() => setClientsLoading(false));
  }, [activeView, shopSlug, clientsPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen h-full bg-gradient-to-br from-[var(--shop-background)] via-[var(--shop-surface-secondary)] to-[var(--shop-surface-secondary)]">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-20 sm:pt-24">
          <LoadingSpinner size="lg" text="Carregando analytics..." />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen h-full bg-gradient-to-br from-[var(--shop-background)] via-[var(--shop-surface-secondary)] to-[var(--shop-surface-secondary)]">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-20 sm:pt-24">
          <ErrorDisplay error={error || new Error('Failed to load analytics')} />
        </div>
      </div>
    );
  }

  const stats = data.summary;

  return (
    <div className="min-h-screen h-full bg-gradient-to-br from-[var(--shop-background)] via-[var(--shop-surface-secondary)] to-[var(--shop-surface-secondary)]">
      <Navigation />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 pb-12">
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="font-['Playfair_Display',serif] text-4xl sm:text-5xl md:text-6xl text-white mb-3">
                Analytics
              </h1>
              <p className="text-sm text-white/50">
                {formatPeriodRange(data.period.since, data.period.until, data.period.days)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-4 py-2.5 bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-xl text-white text-base cursor-pointer focus:outline-none focus:border-[var(--shop-accent)] transition-colors"
              >
                <option value={7}>{periodLabel(7)}</option>
                <option value={30}>{periodLabel(30)}</option>
                <option value={90}>{periodLabel(90)}</option>
                <option value={0}>{t('analytics.periodAll')}</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  downloadAnalyticsPdf(
                    {
                      period: data.period,
                      summary: data.summary,
                      barbers: data.barbers,
                      serviceBreakdown: data.serviceBreakdown,
                      dayOfWeekDistribution: data.dayOfWeekDistribution,
                      cancellationAnalysis: data.cancellationAnalysis,
                      barberEfficiency: data.barberEfficiency,
                    },
                    { shopName: shopConfig.name, periodLabel: periodLabel(data.period.days), locale }
                  );
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-semibold rounded-xl hover:bg-[var(--shop-accent-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-background)]"
              >
                <span className="material-symbols-outlined text-xl">download</span>
                Download PDF
              </button>
            </div>
          </div>

          {/* View Selection Menu */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'overview'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveView('time')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'time'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              Análise Temporal
            </button>
            <button
              onClick={() => setActiveView('services')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'services'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              Serviços
            </button>
            <button
              onClick={() => setActiveView('barbers')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'barbers'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              Barbeiros
            </button>
            <button
              onClick={() => setActiveView('cancellations')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'cancellations'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              Cancelamentos
            </button>
            <button
              onClick={() => setActiveView('demographics')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'demographics'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              Demografia
            </button>
            <button
              onClick={() => setActiveView('clients')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'clients'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              {t('analytics.clientsTab')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-10">
          <div className="bg-[var(--shop-surface-secondary)] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[var(--shop-accent)] mb-2">
              {stats.total}
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              Total
            </div>
          </div>
          <div className="bg-[var(--shop-surface-secondary)] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-white mb-2">
              {stats.completed}
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              Concluídos
            </div>
          </div>
          <div className="bg-[var(--shop-surface-secondary)] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[#ef4444] mb-2">
              {stats.cancelled}
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider mb-2">
              Cancelados
            </div>
            {stats.total > 0 && (
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#ef4444] rounded-full transition-all" style={{ width: `${stats.cancellationRate}%` }} />
              </div>
            )}
          </div>
          <div className="bg-[var(--shop-surface-secondary)] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[var(--shop-accent)] mb-2">
              {stats.completionRate}%
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider mb-2">
              Taxa Conclusão
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--shop-accent)] rounded-full transition-all" style={{ width: `${stats.completionRate}%` }} />
            </div>
          </div>
          <div className="bg-[var(--shop-surface-secondary)] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[#3b82f6] mb-2">
              {stats.avgPerDay}
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              Média/Dia
            </div>
          </div>
          <div className="bg-[var(--shop-surface-secondary)] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[#3b82f6] mb-2">
              {stats.avgServiceTime}m
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              Serviço Médio
            </div>
          </div>
          {stats.revenueCents != null && stats.revenueCents > 0 && (
            <div className="bg-[var(--shop-surface-secondary)] border-2 border-transparent rounded-2xl p-6 text-center">
              <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[var(--shop-accent)] mb-2">
                {(stats.revenueCents / 100).toLocaleString(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
              </div>
              <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
                {t('analytics.revenue')}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* Overview View */}
          {(activeView === 'overview' || activeView === null) && (
            <>
              <AIAnalyticsAdvisor data={data} />
              {data.trends.weekOverWeek !== 0 && (
                <div className="bg-gradient-to-br from-[rgba(59,130,246,0.15)] to-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.3)] rounded-3xl p-8 text-center">
                  <p className="text-sm text-white/70 uppercase tracking-wider mb-3">
                    Tendência Semanal
                  </p>
                  <div className={`font-['Playfair_Display',serif] text-5xl font-semibold mb-3 ${
                    data.trends.weekOverWeek > 0 ? 'text-white' : 'text-[#ef4444]'
                  }`}>
                    {data.trends.weekOverWeek > 0 ? '+' : ''}{data.trends.weekOverWeek}%
                  </div>
                  <p className="text-base text-white/70">
                    {data.trends.weekOverWeek > 0 ? 'Aumento' : 'Queda'} em relação ao período anterior
                  </p>
                </div>
              )}

              {(() => {
                const dayEntries = Object.entries(data.dayOfWeekDistribution);
                const totalByDay = dayEntries.reduce((s, [, n]) => s + n, 0);
                if (totalByDay === 0) return null;
                const busiest = dayEntries.reduce((a, b) => (b[1] > a[1] ? b : a));
                const withData = dayEntries.filter(([, n]) => n > 0);
                const quietest = withData.length > 1
                  ? withData.reduce((a, b) => (b[1] < a[1] ? b : a))
                  : null;
                const busiestName = DAY_NAMES_PT_FULL[busiest[0]] ?? busiest[0];
                const quietestName = quietest ? (DAY_NAMES_PT_FULL[quietest[0]] ?? quietest[0]) : null;
                return (
                  <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[var(--shop-accent)] text-2xl">calendar_today</span>
                      <div className="text-left">
                        <p className="text-xs text-white/50 uppercase tracking-wider">Dia mais movimentado</p>
                        <p className="text-lg font-semibold text-white">{busiestName}</p>
                        <p className="text-sm text-white/60">{busiest[1]} {busiest[1] === 1 ? 'atendimento' : 'atendimentos'}</p>
                      </div>
                    </div>
                    {quietest && quietestName && quietest[0] !== busiest[0] && (
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-white/50 text-2xl">event_available</span>
                        <div className="text-left">
                          <p className="text-xs text-white/50 uppercase tracking-wider">Dia mais calmo</p>
                          <p className="text-lg font-semibold text-white/80">{quietestName}</p>
                          <p className="text-sm text-white/50">{quietest[1]} {quietest[1] === 1 ? 'atendimento' : 'atendimentos'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {data.typeBreakdown && (data.typeBreakdown.walkin > 0 || data.typeBreakdown.appointment > 0) && shopConfig.settings?.allowAppointments && (
                <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8">
                  <h3 className="font-['Playfair_Display',serif] text-xl text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">event_available</span>
                    {t('analytics.walkin')} vs {t('analytics.appointment')}
                  </h3>
                  <TypeBreakdownChart data={data.typeBreakdown} />
                </div>
              )}

              {data.clientMetrics && data.clientMetrics.uniqueClients > 0 && (
                <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[var(--shop-accent)] text-2xl">people</span>
                    <div className="text-left">
                      <p className="text-xs text-white/50 uppercase tracking-wider">{t('analytics.uniqueClients')}</p>
                      <p className="text-lg font-semibold text-white">{data.clientMetrics.uniqueClients}</p>
                      <p className="text-sm text-white/60">{data.clientMetrics.newClients} {t('analytics.newClients')} · {data.clientMetrics.returningClients} {t('analytics.returningClients')} · {data.clientMetrics.repeatRate}% {t('analytics.repeatRate')}</p>
                    </div>
                  </div>
                </div>
              )}

              {data.preferredBarberFulfillment && data.preferredBarberFulfillment.requested > 0 && shopConfig.settings?.allowBarberPreference !== false && (
                <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-6">
                  <h3 className="font-['Playfair_Display',serif] text-xl text-white mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">thumb_up</span>
                    {t('analytics.preferredBarberFulfillment')}
                  </h3>
                  <p className="text-white/70 text-sm">{data.preferredBarberFulfillment.fulfilled} / {data.preferredBarberFulfillment.requested} ({data.preferredBarberFulfillment.rate}%)</p>
                </div>
              )}

              {data.appointmentMetrics && data.appointmentMetrics.total > 0 && (
                <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-6">
                  <h3 className="font-['Playfair_Display',serif] text-xl text-white mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">event_busy</span>
                    Agendamentos
                  </h3>
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <span className="text-white/50">{t('analytics.appointmentNoShow')}: </span>
                      <span className="text-white font-medium">{data.appointmentMetrics.noShows} ({data.appointmentMetrics.noShowRate}%)</span>
                    </div>
                    <div>
                      <span className="text-white/50">{t('analytics.avgMinutesLate')}: </span>
                      <span className="text-white font-medium">{data.appointmentMetrics.avgMinutesLate} min</span>
                    </div>
                    <div>
                      <span className="text-white/50">{t('analytics.onTime')}: </span>
                      <span className="text-white font-medium">{data.appointmentMetrics.onTimeCount}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Time Analysis View */}
          {activeView === 'time' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden min-h-[420px] flex flex-col">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                  <div className="mb-6 flex items-center gap-4 flex-shrink-0">
                    <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">bar_chart</span>
                    <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                      Atendimentos por Dia
                    </h2>
                  </div>
                  <div className="flex-1 min-h-[280px]">
                    <DailyChart data={data.ticketsByDay} />
                  </div>
                </div>

                <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden min-h-[420px] flex flex-col">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                  <div className="mb-6 flex items-center gap-4 flex-shrink-0">
                    <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">schedule</span>
                    <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                      Atendimentos por Hora
                    </h2>
                  </div>
                  <div className="flex-1 min-h-[280px]">
                    <HourlyChart data={data.hourlyDistribution} peakHour={data.peakHour} />
                  </div>
                </div>
              </div>

              <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                <div className="mb-6 flex items-center gap-4">
                  <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">calendar_month</span>
                  <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                    Padrão Semanal
                  </h2>
                </div>
                <DayOfWeekChart data={data.dayOfWeekDistribution} />
              </div>

              <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                <div className="mb-6 flex items-center gap-4">
                  <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">trending_up</span>
                  <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                    Tendência de Tempo de Espera
                  </h2>
                </div>
                <WaitTimeTrendChart data={data.waitTimeTrends} />
              </div>

              {data.peakHour && (
                <div className="bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_15%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_5%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-3xl p-10 text-center">
                  <p className="text-sm text-white/70 uppercase tracking-wider mb-3">
                    Horário de Pico
                  </p>
                  <div className="font-['Playfair_Display',serif] text-6xl font-semibold text-[var(--shop-accent)] mb-3">
                    {data.peakHour.hour}:00
                  </div>
                  <p className="text-base text-white/70">
                    {data.peakHour.count} {data.peakHour.count === 1 ? 'atendimento' : 'atendimentos'}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Services View */}
          {activeView === 'services' && (
            <>
              <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                <div className="mb-6 flex items-center gap-4">
                  <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">pie_chart</span>
                  <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                    Serviços
                  </h2>
                </div>
                <ServiceBreakdownChart data={data.serviceBreakdown} />
              </div>

              {data.serviceBreakdown.length > 0 && (
                <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                  <div className="mb-6 flex items-center gap-4">
                    <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">timer</span>
                    <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                      Distribuição de Tempo de Serviço
                    </h2>
                  </div>
                  <ServiceTimeDistributionChart data={data.serviceTimeDistribution} />
                </div>
              )}
            </>
          )}

          {/* Barbers View */}
          {activeView === 'barbers' && (
            <>
              {data.barberEfficiency.length > 0 && (
                <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                  <div className="mb-6 flex items-center gap-4">
                    <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">speed</span>
                    <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                      Eficiência por Barbeiro
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.barberEfficiency.map((barber) => {
                      const barberInfo = data.barbers.find(b => b.id === barber.id);
                      return (
                        <div
                          key={barber.id}
                          className="bg-[rgba(36,36,36,0.8)] border border-[var(--shop-border-color)] rounded-2xl p-6"
                        >
                          <h4 className="text-xl text-white mb-4 truncate">{barber.name}</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="font-['Playfair_Display',serif] text-2xl font-semibold text-[var(--shop-accent)]">
                                {barber.ticketsPerDay.toFixed(1)}
                              </div>
                              <div className="text-xs text-white/50 uppercase mt-1">
                                Tickets/Dia
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="font-['Playfair_Display',serif] text-2xl font-semibold text-white">
                                {barber.completionRate}%
                              </div>
                              <div className="text-xs text-white/50 uppercase mt-1">
                                Conclusão
                              </div>
                            </div>
                          </div>
                          {barberInfo && (
                            <div className="mt-4 pt-4 border-t border-[var(--shop-border-color)]">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-white/70">Atendidos:</span>
                                <span className="text-white font-semibold">{barberInfo.totalServed}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm mt-2">
                                <span className="text-white/70">Tempo médio:</span>
                                <span className="text-white font-semibold">{barberInfo.avgServiceTime}m</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {data.barbers.length > 0 && (
                <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                  <div className="mb-6 flex items-center gap-4">
                    <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">content_cut</span>
                    <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                      Desempenho por Barbeiro
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.barbers.map((barber) => (
                      <div
                        key={barber.id}
                        className="bg-[rgba(36,36,36,0.8)] border border-[var(--shop-border-color)] rounded-2xl p-6 flex items-center gap-6"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] rounded-full flex items-center justify-center text-2xl font-semibold text-[var(--shop-text-on-accent)] flex-shrink-0">
                          {barber.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xl text-white mb-3 truncate">{barber.name}</h4>
                          <div className="flex gap-6">
                            <div className="text-center">
                              <div className="font-['Playfair_Display',serif] text-2xl font-semibold text-[var(--shop-accent)]">
                                {barber.totalServed}
                              </div>
                              <div className="text-xs text-white/50 uppercase mt-1">
                                Atendidos
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="font-['Playfair_Display',serif] text-2xl font-semibold text-[var(--shop-accent)]">
                                {barber.avgServiceTime}m
                              </div>
                              <div className="text-xs text-white/50 uppercase mt-1">
                                Média
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Cancellations View */}
          {activeView === 'cancellations' && (
            <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
              <div className="mb-6 flex items-center gap-4">
                <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">cancel</span>
                <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                  Análise de Cancelamentos
                </h2>
              </div>
              <CancellationChart data={data.cancellationAnalysis} />
            </div>
          )}

          {/* Demographics View */}
          {activeView === 'demographics' && (
            <>
              {data.demographics && (
                <DemographicsInsights
                  locationBreakdown={data.demographics.locationBreakdown}
                  genderBreakdown={data.demographics.genderBreakdown}
                  ageBreakdown={data.demographics.ageBreakdown}
                  styleBreakdown={data.demographics.styleBreakdown}
                  ruleBased={data.correlations?.ruleBased ?? []}
                />
              )}
              {data.demographics ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {data.demographics.locationBreakdown.length > 0 && (
                    <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                      <div className="mb-6 flex items-center gap-4">
                        <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">location_on</span>
                        <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                          Localização
                        </h2>
                      </div>
                      <LocationChart data={data.demographics.locationBreakdown} />
                    </div>
                  )}
                  {data.demographics.genderBreakdown.length > 0 && (
                    <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                      <div className="mb-6 flex items-center gap-4">
                        <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">people</span>
                        <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                          Gênero
                        </h2>
                      </div>
                      <div className="space-y-3">
                        {data.demographics.genderBreakdown.map((g) => (
                          <div key={g.gender} className="flex items-center justify-between gap-4">
                            <span className="text-white font-medium">{g.gender === 'unknown' ? 'Não informado' : g.gender}</span>
                            <span className="text-[#D4AF37] font-semibold">{g.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.demographics.ageBreakdown.some((a) => a.count > 0) && (
                    <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                      <div className="mb-6 flex items-center gap-4">
                        <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">cake</span>
                        <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                          Faixa Etária
                        </h2>
                      </div>
                      <div className="space-y-3">
                        {data.demographics.ageBreakdown.map((a) => (
                          <div key={a.range} className="flex items-center justify-between gap-4">
                            <span className="text-white font-medium">{a.range} anos</span>
                            <span className="text-[#D4AF37] font-semibold">{a.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.demographics.styleBreakdown.length > 0 && (
                    <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                      <div className="mb-6 flex items-center gap-4">
                        <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">content_cut</span>
                        <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                          Estilos Citados
                        </h2>
                      </div>
                      <div className="space-y-3">
                        {data.demographics.styleBreakdown.map((s) => (
                          <div key={s.style} className="flex items-center justify-between gap-4">
                            <span className="text-white font-medium capitalize">{s.style}</span>
                            <span className="text-[#D4AF37] font-semibold">{s.count}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-12 text-center">
                  <p className="text-white/50">{t('common.noDataAvailable')}</p>
                  <p className="text-white/40 text-sm mt-2">Clientes com endereço ou dados demográficos preenchidos aparecerão aqui.</p>
                </div>
              )}
            </>
          )}

          {/* Clients View */}
          {activeView === 'clients' && (
            <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
              <div className="mb-6 flex items-center gap-4">
                <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">people</span>
                <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                  {t('analytics.clientsTab')}
                </h2>
              </div>
              {clientsLoading ? (
                <div className="flex items-center justify-center py-16 text-white/70">
                  <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
                </div>
              ) : clientsList ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clientsList.clients.map((client) => (
                      <div
                        key={client.id}
                        className="bg-[rgba(36,36,36,0.8)] border border-[var(--shop-border-color)] rounded-2xl p-6 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-lg text-white truncate font-medium">{client.name || 'Cliente'}</h4>
                          <p className="text-sm text-white/60 mt-1">
                            {t('analytics.ticketCount')}: {client.ticketCount}
                          </p>
                          <p className="text-xs text-white/40 mt-1">
                            {new Date(client.createdAt).toLocaleDateString(locale, { dateStyle: 'medium' })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setClientModalId(client.id)}
                          className="p-2 rounded-xl bg-[var(--shop-accent)]/20 text-[var(--shop-accent)] hover:bg-[var(--shop-accent)]/30 transition-colors flex-shrink-0"
                          title={t('analytics.clientInfo')}
                          aria-label={t('analytics.clientInfo')}
                        >
                          <span className="material-symbols-outlined">person</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  {clientsList.clients.length === 0 ? (
                    <p className="text-center text-white/50 py-8">{t('common.noDataAvailable')}</p>
                  ) : (
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <button
                        type="button"
                        onClick={() => setClientsPage((p) => Math.max(1, p - 1))}
                        disabled={clientsPage <= 1}
                        className="px-4 py-2 rounded-xl bg-[var(--shop-surface-primary)] border border-[var(--shop-border-color)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                      >
                        {t('common.back')}
                      </button>
                      <span className="text-white/70 text-sm">
                        {clientsPage} / {Math.ceil(clientsList.total / 24) || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setClientsPage((p) => p + 1)}
                        disabled={clientsPage * 24 >= clientsList.total}
                        className="px-4 py-2 rounded-xl bg-[var(--shop-surface-primary)] border border-[var(--shop-border-color)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                      >
                        {t('common.next')}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-white/50 py-8">{t('common.noDataAvailable')}</p>
              )}
            </div>
          )}
        </div>

        {clientModalId != null && (
          <ClientInfoModal clientId={clientModalId} onClose={() => setClientModalId(null)} />
        )}
      </main>
    </div>
  );
}
