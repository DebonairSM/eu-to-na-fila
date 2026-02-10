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
import { DayOfWeekChart } from '@/components/DayOfWeekChart';
import { WaitTimeTrendChart } from '@/components/WaitTimeTrendChart';
import { CancellationChart } from '@/components/CancellationChart';
import { ServiceTimeDistributionChart } from '@/components/ServiceTimeDistributionChart';
import { DAY_NAMES_PT_FULL } from '@/lib/constants';
import { downloadAnalyticsPdf } from '@/lib/analyticsPdf';

function formatPeriodRange(since: string, until: string, days: number): string {
  if (days === 0) return 'Todo o período';
  const s = new Date(since);
  const u = new Date(until);
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(s)} – ${fmt(u)}`;
}

function periodLabel(days: number): string {
  if (days === 0) return 'Todo o período';
  return `${days} dias`;
}

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
  serviceBreakdown: Array<{ serviceId: number; serviceName: string; count: number; percentage: number }>;
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
}

type AnalyticsView = 'overview' | 'time' | 'services' | 'barbers' | 'cancellations';

export function AnalyticsPage() {
  const shopSlug = useShopSlug();
  const { config: shopConfig } = useShopConfig();
  const { isOwner } = useAuthContext();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeView, setActiveView] = useState<AnalyticsView>('overview');

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
                <option value={7}>7 dias</option>
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
                <option value={0}>Todo o período</option>
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
                    { shopName: shopConfig.name, periodLabel: periodLabel(data.period.days) }
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
        </div>
      </main>
    </div>
  );
}
