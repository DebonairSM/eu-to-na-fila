import { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { BarberServiceHistoryResponse } from '@/lib/api/analytics';
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
import { BarberProductivityByDayChart, type ProductivityTimeScope } from '@/components/BarberProductivityByDayChart';
import { WaitTimeTrendChart } from '@/components/WaitTimeTrendChart';
import { CancellationChart } from '@/components/CancellationChart';
import { ServiceTimeDistributionChart } from '@/components/ServiceTimeDistributionChart';
import { TypeBreakdownChart } from '@/components/TypeBreakdownChart';
import { ClientInfoModal } from '@/components/ClientInfoModal';
import { DAY_ORDER_API } from '@/lib/constants';
import { downloadAnalyticsPdf } from '@/lib/analyticsPdf';
import { downloadBarberServiceHistoryCsv } from '@/lib/barberHistoryCsv';
import { useLocale } from '@/contexts/LocaleContext';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { formatDate } from '@/lib/format';
import { formatNameForDisplay } from '@/lib/utils';
import {
  dayKeyFromIso,
  englishWeekdayFromUtcDayKey,
  getDetailApiRange,
  lastDateOfWeekdayInRange,
  type TimeDetailFrame,
} from '@/lib/timeAnalyticsDetail';

interface AnalyticsData {
  period: {
    days: number;
    since: string;
    until: string;
    /** Calendar days (shop TZ) overlapping the window; context vs openDays. */
    calendarDays?: number;
    /** Days used for avg/day and barber tickets/day (scheduled open days, or calendar if no hours). */
    openDays?: number;
  };
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    waiting: number;
    inProgress: number;
    pending?: number;
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
    totalActivityMinutes?: number;
    avgWorkTimeMinutesSinceMonthStart?: number | null;
    ratingCount?: number;
    avgRating?: number | null;
  }>;
  barberServiceWeekdayStats?: Array<{
    barberId: number;
    barberName: string;
    serviceId: number;
    serviceName: string;
    dayOfWeek: number;
    dayName: string;
    avgDurationMinutes: number;
    totalCompleted: number;
  }>;
  barberProductivityByDayAllTime?: Array<{
    barberId: number;
    barberName: string;
    dayOfWeek: number;
    dayName: string;
    avgDurationMinutes: number;
    totalCompleted: number;
  }>;
  barberProductivityByDayInPeriod?: Array<{
    barberId: number;
    barberName: string;
    dayOfWeek: number;
    dayName: string;
    avgDurationMinutes: number;
    totalCompleted: number;
  }>;
  ticketsByDay: Record<string, number>;
  hourlyDistribution: Record<number, number>;
  peakHour: { hour: number; count: number } | null;
  serviceBreakdown: Array<{ serviceId: number; serviceName: string; count: number; percentage: number; revenueCents?: number }>;
  dayOfWeekDistribution: Record<string, number>;
  waitTimeTrends: Record<string, number>;
  waitTimeTrendsByHour?: Record<string, number>;
  waitTimeTrendsByWeek?: Record<string, number>;
  waitTimeTrendsByMonth?: Record<string, number>;
  waitTimeTrendsByYear?: Record<string, number>;
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
    ratingCount?: number;
    avgRating?: number | null;
    serviceAverages?: Array<{
      serviceId: number;
      serviceName: string;
      avgMinutes: number;
      completedCount: number;
    }>;
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

type PeriodSelect = '1' | '7' | '30' | '90' | 'all' | 'month';

function getTodayRange(): { since: string; until: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const s = `${y}-${m}-${day}`;
  return { since: s, until: s };
}

function getMonthRange(year: number, month: number): { since: string; until: string } {
  const since = `${year}-${String(month).padStart(2, '0')}-01`;
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const until = isCurrentMonth
    ? `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    : `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  return { since, until };
}

function getMonthLabelFromRange(since: string, until: string, locale: string, soFarLabel: string): string {
  const s = new Date(since);
  const u = new Date(until);
  const monthName = s.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const lastDayOfMonth = new Date(s.getFullYear(), s.getMonth() + 1, 0);
  const isPartialMonth = u.getTime() < lastDayOfMonth.setHours(23, 59, 59, 999);
  return isPartialMonth ? `${monthName}${soFarLabel}` : monthName;
}

export function AnalyticsPage() {
  const shopSlug = useShopSlug();
  const { config: shopConfig } = useShopConfig();
  const { isOwner } = useAuthContext();
  const { locale, t } = useLocale();
  const navigate = useNavigate();
  const now = new Date();
  const dayLabelsShort = useMemo(
    () =>
      Object.fromEntries(
        DAY_ORDER_API.map((day) => [day, t(`common.dayShort.${day}`)])
      ) as Record<string, string>,
    [t]
  );
  const [periodSelect, setPeriodSelect] = useState<PeriodSelect>('30');
  const [monthYear, setMonthYear] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeView, setActiveView] = useState<AnalyticsView>('overview');
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsList, setClientsList] = useState<{ clients: Array<{ id: number; name: string; phone: string; email: string | null; createdAt: string; ticketCount: number }>; total: number } | null>(null);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientModalId, setClientModalId] = useState<number | null>(null);
  const [historyBarber, setHistoryBarber] = useState<{ id: number; name: string } | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyData, setHistoryData] = useState<BarberServiceHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [productivityTimeScope, setProductivityTimeScope] = useState<ProductivityTimeScope>('all_time');
  const [productivityWeekStart, setProductivityWeekStart] = useState<string | null>(null);
  const [productivityWeekData, setProductivityWeekData] = useState<Array<{ barberId: number; barberName: string; dayOfWeek: number; dayName: string; avgDurationMinutes: number; totalCompleted: number }> | null>(null);
  const [productivityWeekLoading, setProductivityWeekLoading] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
  const [downloadBarberModal, setDownloadBarberModal] = useState<{ id: number; name: string } | null>(null);
  const [downloadCsvLoading, setDownloadCsvLoading] = useState(false);
  const [downloadRange, setDownloadRange] = useState<'full' | 'partial'>('full');
  const [downloadSince, setDownloadSince] = useState('');
  const [downloadUntil, setDownloadUntil] = useState('');
  const downloadDialogRef = useDialogA11y(downloadBarberModal != null, () => setDownloadBarberModal(null));
  const historyDialogRef = useDialogA11y(historyBarber != null, () => setHistoryBarber(null));

  // Temporal view: month-scoped charts (default: current month through today)
  const [temporalChartMonth, setTemporalChartMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const [temporalChartData, setTemporalChartData] = useState<AnalyticsData | null>(null);
  const [temporalChartLoading, setTemporalChartLoading] = useState(false);
  const [temporalChartError, setTemporalChartError] = useState(false);

  const [timeDetailFrame, setTimeDetailFrame] = useState<TimeDetailFrame>('month');
  const [selectedDetailDayKey, setSelectedDetailDayKey] = useState<string | null>(null);
  const [timeDetailData, setTimeDetailData] = useState<AnalyticsData | null>(null);
  const [timeDetailLoading, setTimeDetailLoading] = useState(false);

  // Week options for productivity chart (Monday-based): this week, last week, 2 weeks ago, ... 5 weeks ago
  const weekOptionsForProductivity = (() => {
    const options: { value: string; label: string }[] = [];
    const pad = (n: number) => String(n).padStart(2, '0');
    for (let i = 0; i <= 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - 7 * i);
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(d);
      monday.setDate(d.getDate() - diff);
      const weekStart = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const label = i === 0 ? t('analytics.weekThis') : i === 1 ? t('analytics.weekLast') : t('analytics.weekN').replace('{{n}}', String(i));
      const rangeLabel = `${formatDate(monday, locale)} – ${formatDate(sunday, locale)}`;
      options.push({ value: weekStart, label: `${label} (${rangeLabel})` });
    }
    return options;
  })();

  const productivityWeekLabel = productivityWeekStart && productivityWeekData != null
    ? (() => {
        const [y, m, d] = productivityWeekStart.split('-').map(Number);
        const mon = new Date(y, (m ?? 1) - 1, d ?? 1);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return `${formatDate(mon, locale)} – ${formatDate(sun, locale)}`;
      })()
    : undefined;

  useEffect(() => {
    if (productivityTimeScope !== 'week' || !productivityWeekStart || !shopSlug) {
      if (productivityTimeScope !== 'week') setProductivityWeekData(null);
      return;
    }
    setProductivityWeekLoading(true);
    api
      .getBarberProductivityByWeek(shopSlug, productivityWeekStart)
      .then((res) => setProductivityWeekData(res.barberProductivityByDay))
      .catch(() => setProductivityWeekData([]))
      .finally(() => setProductivityWeekLoading(false));
  }, [productivityTimeScope, productivityWeekStart, shopSlug]);

  const formatActivityMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatPeriodRange = (since: string, until: string, periodDays: number): string => {
    if (periodDays === 0) return t('analytics.periodAll');
    const s = new Date(since);
    const u = new Date(until);
    return `${formatDate(s, locale)} – ${formatDate(u, locale)}`;
  };

  const periodLabel = (periodDays: number, since?: string, until?: string): string => {
    if (periodDays === 0) return t('analytics.periodAll');
    if (since != null && until != null && since === until) return t('analytics.periodDay');
    if (since != null && until != null) {
      const s = new Date(since);
      const u = new Date(until);
      if (s.getFullYear() === u.getFullYear() && s.getMonth() === u.getMonth()) {
        return getMonthLabelFromRange(since, until, locale, t('analytics.monthLabelSoFar'));
      }
    }
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
        let query: { since: string; until: string } | number;
        if (periodSelect === 'month') {
          query = getMonthRange(monthYear.year, monthYear.month);
        } else if (periodSelect === '1') {
          query = getTodayRange();
        } else if (periodSelect === 'all') {
          query = 0;
        } else {
          query = Number(periodSelect);
        }
        const analyticsData =
          typeof query === 'object'
            ? await api.getAnalytics(shopSlug, { since: query.since, until: query.until })
            : await api.getAnalytics(shopSlug, query);
        setData(analyticsData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        } else if (err && typeof err === 'object' && 'error' in err) {
          setError(new Error((err as { error: string }).error));
        } else {
          setError(new Error(t('analytics.loadError')));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [periodSelect, monthYear.year, monthYear.month, shopSlug]);

  useEffect(() => {
    if (activeView !== 'clients' || !shopSlug) return;
    setClientsLoading(true);
    api
      .listClients(shopSlug, clientsPage, 24)
      .then((res) => setClientsList({ clients: res.clients, total: res.total }))
      .catch(() => setClientsList(null))
      .finally(() => setClientsLoading(false));
  }, [activeView, shopSlug, clientsPage]);

  useEffect(() => {
    if (!historyBarber || !shopSlug) {
      setHistoryData(null);
      return;
    }
    setHistoryLoading(true);
    api
      .getBarberServiceHistory(shopSlug, historyBarber.id, { page: historyPage, limit: 25 })
      .then(setHistoryData)
      .catch(() => setHistoryData({ tickets: [], total: 0 }))
      .finally(() => setHistoryLoading(false));
  }, [historyBarber, shopSlug, historyPage]);

  // Fetch month-scoped data for temporal view (useLayoutEffect so we do not flash overview-period data)
  useLayoutEffect(() => {
    if (activeView !== 'time' || !shopSlug) {
      return;
    }
    const { since, until } = getMonthRange(temporalChartMonth.year, temporalChartMonth.month);
    setTemporalChartLoading(true);
    setTemporalChartError(false);
    api
      .getAnalytics(shopSlug, { since, until })
      .then((d) => {
        setTemporalChartData(d);
        setTemporalChartError(false);
      })
      .catch(() => {
        setTemporalChartData(null);
        setTemporalChartError(true);
      })
      .finally(() => setTemporalChartLoading(false));
  }, [activeView, shopSlug, temporalChartMonth.year, temporalChartMonth.month]);

  useEffect(() => {
    if (!temporalChartData) return;
    setSelectedDetailDayKey(dayKeyFromIso(temporalChartData.period.until));
  }, [temporalChartData?.period.since, temporalChartData?.period.until]);

  useEffect(() => {
    if (activeView !== 'time' || !shopSlug || !temporalChartData) return;
    if (timeDetailFrame === 'month') {
      setTimeDetailLoading(false);
      return;
    }
    const ms = dayKeyFromIso(temporalChartData.period.since);
    const mu = dayKeyFromIso(temporalChartData.period.until);
    const day = selectedDetailDayKey ?? mu;
    const range = getDetailApiRange(timeDetailFrame, day, ms, mu);
    if (!range) return;
    let cancelled = false;
    setTimeDetailLoading(true);
    setTimeDetailData(null);
    api
      .getAnalytics(shopSlug, range)
      .then((d) => {
        if (!cancelled) setTimeDetailData(d);
      })
      .catch(() => {
        if (!cancelled) setTimeDetailData(null);
      })
      .finally(() => {
        if (!cancelled) setTimeDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeView, shopSlug, temporalChartData, timeDetailFrame, selectedDetailDayKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen h-full bg-gradient-to-br from-[var(--shop-background)] via-[var(--shop-surface-secondary)] to-[var(--shop-surface-secondary)]">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-20 sm:pt-24">
          <LoadingSpinner size="lg" text={t('analytics.loading')} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen h-full bg-gradient-to-br from-[var(--shop-background)] via-[var(--shop-surface-secondary)] to-[var(--shop-surface-secondary)]">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-20 sm:pt-24">
          <ErrorDisplay error={error || new Error(t('analytics.loadError'))} />
        </div>
      </div>
    );
  }

  const stats = data.summary;

  // Time view: only month-scoped fetch (never fall back to overview `data` — wrong period/labels)
  const timeData = temporalChartData;
  const isCurrentTemporalMonth =
    temporalChartMonth.year === now.getFullYear() && temporalChartMonth.month === now.getMonth() + 1;
  const temporalMonthLabel = new Date(temporalChartMonth.year, temporalChartMonth.month - 1, 1).toLocaleDateString(
    locale,
    { month: 'long', year: 'numeric' }
  );
  const goTemporalPrevMonth = () => {
    setTemporalChartMonth((prev) => {
      if (prev.month <= 1) return { year: prev.year - 1, month: 12 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };
  const goTemporalNextMonth = () => {
    if (isCurrentTemporalMonth) return;
    setTemporalChartMonth((prev) => {
      if (prev.month >= 12) return { year: prev.year + 1, month: 1 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const selectedDayEffective =
    selectedDetailDayKey ?? (timeData ? dayKeyFromIso(timeData.period.until) : null);
  const weekdayHighlightFromSelection =
    selectedDayEffective != null ? englishWeekdayFromUtcDayKey(selectedDayEffective) : undefined;
  const timeDetailChartsData: AnalyticsData | null =
    timeData == null ? null : timeDetailFrame === 'month' ? timeData : timeDetailData;
  const timeDetailChartsBusy = timeDetailFrame !== 'month' && timeDetailLoading;
  const formatTimeDetailPeriodLabel = (d: AnalyticsData) => {
    const s = new Date(`${dayKeyFromIso(d.period.since)}T12:00:00.000Z`);
    const u = new Date(`${dayKeyFromIso(d.period.until)}T12:00:00.000Z`);
    return `${formatDate(s, locale)} – ${formatDate(u, locale)}`;
  };

  const onTimeDailyBarSelect = (dayKey: string) => {
    setSelectedDetailDayKey(dayKey);
    setTimeDetailFrame('day');
  };

  const onTimeWeeklyPatternDayClick = (englishDay: string) => {
    if (!timeData) return;
    const ms = dayKeyFromIso(timeData.period.since);
    const mu = dayKeyFromIso(timeData.period.until);
    const picked = lastDateOfWeekdayInRange(ms, mu, englishDay);
    if (picked) {
      setSelectedDetailDayKey(picked);
      setTimeDetailFrame('week');
    }
  };

  return (
    <div className="min-h-screen h-full bg-gradient-to-br from-[var(--shop-background)] via-[var(--shop-surface-secondary)] to-[var(--shop-surface-secondary)]">
      <Navigation />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 pb-12">
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="font-['Playfair_Display',serif] text-4xl sm:text-5xl md:text-6xl text-white mb-3">
                {t('analytics.pageTitle')}
              </h1>
              <p className="text-sm text-white/50">
                {formatPeriodRange(data.period.since, data.period.until, data.period.days)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={periodSelect}
                onChange={(e) => setPeriodSelect(e.target.value as PeriodSelect)}
                className="select-readable px-4 py-2.5 bg-white border border-[var(--shop-border-color)] rounded-xl text-gray-900 text-base cursor-pointer focus:outline-none focus:border-[var(--shop-accent)] transition-colors"
              >
                <option value="1">{t('analytics.periodDay')}</option>
                <option value="7">{periodLabel(7)}</option>
                <option value="30">{periodLabel(30)}</option>
                <option value="90">{periodLabel(90)}</option>
                <option value="month">{t('analytics.periodMonth')}</option>
                <option value="all">{t('analytics.periodAll')}</option>
              </select>
              {periodSelect === 'month' && (
                <>
                  <select
                    value={monthYear.month}
                    onChange={(e) => setMonthYear((m) => ({ ...m, month: Number(e.target.value) }))}
                    className="select-readable px-4 py-2.5 bg-white border border-[var(--shop-border-color)] rounded-xl text-gray-900 text-base cursor-pointer focus:outline-none focus:border-[var(--shop-accent)] transition-colors"
                    aria-label={t('analytics.month')}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleDateString(locale, { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={monthYear.year}
                    onChange={(e) => setMonthYear((m) => ({ ...m, year: Number(e.target.value) }))}
                    className="select-readable px-4 py-2.5 bg-white border border-[var(--shop-border-color)] rounded-xl text-gray-900 text-base cursor-pointer focus:outline-none focus:border-[var(--shop-accent)] transition-colors"
                    aria-label={t('analytics.year')}
                  >
                    {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  downloadAnalyticsPdf(
                    data,
                    {
                      shopName: shopConfig.name,
                      periodLabel: periodLabel(data.period.days, data.period.since, data.period.until),
                      locale,
                      title: t('analytics.pdf.title'),
                      labels: {
                        title: t('analytics.pdf.title'),
                        period: t('analytics.pdf.period'),
                        summary: t('analytics.pdf.summary'),
                        metric: t('analytics.pdf.metric'),
                        value: t('analytics.pdf.value'),
                        totalTickets: t('analytics.pdf.totalTickets'),
                        completed: t('analytics.pdf.completed'),
                        cancelled: t('analytics.pdf.cancelled'),
                        completionRate: t('analytics.pdf.completionRate'),
                        cancellationRate: t('analytics.pdf.cancellationRate'),
                        avgPerDay: t('analytics.pdf.avgPerDay'),
                        avgServiceTime: t('analytics.pdf.avgServiceTime'),
                        revenue: t('analytics.pdf.revenue'),
                        barbers: t('analytics.pdf.barbers'),
                        barber: t('analytics.pdf.barber'),
                        served: t('analytics.pdf.served'),
                        avgMinutes: t('analytics.pdf.avgMinutes'),
                        services: t('analytics.pdf.services'),
                        service: t('analytics.pdf.service'),
                        quantity: t('analytics.pdf.quantity'),
                        attendancesByDayOfWeek: t('analytics.pdf.attendancesByDayOfWeek'),
                        day: t('analytics.pdf.day'),
                        attendances: t('analytics.pdf.attendances'),
                        cancellations: t('analytics.pdf.cancellations'),
                        avgTimeBeforeCancellation: t('analytics.pdf.avgTimeBeforeCancellation'),
                        efficiencyByBarber: t('analytics.pdf.efficiencyByBarber'),
                        ticketsPerDay: t('analytics.pdf.ticketsPerDay'),
                        completionRatePct: t('analytics.pdf.completionRatePct'),
                        calendarDays: t('analytics.pdf.calendarDays'),
                        openDays: t('analytics.pdf.openDays'),
                        closedDays: t('analytics.pdf.closedDays'),
                        avgPerOpenDay: t('analytics.pdf.avgPerOpenDay'),
                        ticketsPerOpenDay: t('analytics.pdf.ticketsPerOpenDay'),
                        dayBasisNote: t('analytics.pdf.dayBasisNote'),
                        hourlyOpenHoursNote: t('analytics.pdf.hourlyOpenHoursNote'),
                      },
                    }
                  );
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-semibold rounded-xl hover:bg-[var(--shop-accent-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-background)]"
              >
                <span className="material-symbols-outlined text-xl">download</span>
                {t('analytics.downloadPdf')}
              </button>
            </div>
          </div>

          {/* View Selection Menu */}
          <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label={t('analytics.viewTabs')}>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'overview'}
              onClick={() => setActiveView('overview')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'overview'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              {t('analytics.overviewTab')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'time'}
              onClick={() => setActiveView('time')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'time'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              {t('analytics.timeTab')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'services'}
              onClick={() => setActiveView('services')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'services'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              {t('analytics.servicesTab')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'barbers'}
              onClick={() => setActiveView('barbers')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'barbers'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              {t('analytics.barbersTab')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'cancellations'}
              onClick={() => setActiveView('cancellations')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'cancellations'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              {t('analytics.cancellationsTab')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'demographics'}
              onClick={() => setActiveView('demographics')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'demographics'
                  ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                  : 'bg-[var(--shop-surface-secondary)] text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] hover:bg-[var(--shop-surface-primary)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              {t('analytics.demographicsTab')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'clients'}
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
              {t('analytics.total')}
            </div>
          </div>
          <div className="bg-[var(--shop-surface-secondary)] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-white mb-2">
              {stats.completed}
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              {t('analytics.completed')}
            </div>
          </div>
          <div className="bg-[var(--shop-surface-secondary)] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[#ef4444] mb-2">
              {stats.cancelled}
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider mb-2">
              {t('analytics.cancelled')}
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
              {t('analytics.completionRate')}
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
              {t('analytics.avgPerDay')}
            </div>
          </div>
          <div className="bg-[var(--shop-surface-secondary)] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[#3b82f6] mb-2">
              {stats.avgServiceTime}m
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              {t('analytics.avgService')}
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
                    {t('analytics.trendWeekly')}
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
                const busiestName = t(`common.dayFull.${busiest[0]}`) || busiest[0];
                const quietestName = quietest ? (t(`common.dayFull.${quietest[0]}`) || quietest[0]) : null;
                return (
                  <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[var(--shop-accent)] text-2xl">calendar_today</span>
                      <div className="text-left">
                        <p className="text-xs text-white/50 uppercase tracking-wider">{t('analytics.busiestDay')}</p>
                        <p className="text-lg font-semibold text-white">{busiestName}</p>
                        <p className="text-sm text-white/60">{busiest[1]} {busiest[1] === 1 ? t('analytics.attendanceOne') : t('analytics.attendanceMany')}</p>
                      </div>
                    </div>
                    {quietest && quietestName && quietest[0] !== busiest[0] && (
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-white/50 text-2xl">event_available</span>
                        <div className="text-left">
                          <p className="text-xs text-white/50 uppercase tracking-wider">{t('analytics.quietestDay')}</p>
                          <p className="text-lg font-semibold text-white/80">{quietestName}</p>
                          <p className="text-sm text-white/50">{quietest[1]} {quietest[1] === 1 ? t('analytics.attendanceOne') : t('analytics.attendanceMany')}</p>
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

          {/* Time Analysis View — month-scoped with prev/next month navigation */}
          {activeView === 'time' && (
            <>
              {temporalChartLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 min-h-[320px] rounded-3xl border border-[var(--shop-border-color)] bg-[var(--shop-surface-secondary)] px-6">
                  <p className="text-center font-medium text-white capitalize">{temporalMonthLabel}</p>
                  <LoadingSpinner size="lg" text={t('analytics.loading')} />
                </div>
              ) : temporalChartError || !timeData ? (
                <div className="rounded-3xl border border-[var(--shop-border-color)] bg-[var(--shop-surface-secondary)] p-8">
                  <ErrorDisplay error={new Error(t('analytics.loadError'))} />
                </div>
              ) : (
                <>
                  <div className="mb-8 md:mb-10">
                    <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                      <div className="mb-6 flex items-center justify-between gap-4 flex-shrink-0 flex-wrap">
                        <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">bar_chart</span>
                          <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                            {t('analytics.attendancesByDay')}
                          </h2>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={goTemporalPrevMonth}
                            className="p-2 rounded-lg border border-[var(--shop-border-color)] text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            aria-label={t('analytics.monthPrev')}
                          >
                            <span className="material-symbols-outlined">chevron_left</span>
                          </button>
                          <span className="min-w-[140px] text-center font-medium text-white capitalize">{temporalMonthLabel}</span>
                          <button
                            type="button"
                            onClick={goTemporalNextMonth}
                            disabled={isCurrentTemporalMonth}
                            className="p-2 rounded-lg border border-[var(--shop-border-color)] text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            aria-label={t('analytics.monthNext')}
                          >
                            <span className="material-symbols-outlined">chevron_right</span>
                          </button>
                        </div>
                      </div>
                      <DailyChart
                        data={timeData.ticketsByDay}
                        since={timeData.period.since.split('T')[0]}
                        until={timeData.period.until.split('T')[0]}
                        selectedDay={selectedDayEffective ?? undefined}
                        onDaySelect={onTimeDailyBarSelect}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    {(['day', 'week', 'month'] as const).map((frame) => (
                      <button
                        key={frame}
                        type="button"
                        onClick={() => setTimeDetailFrame(frame)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                          timeDetailFrame === frame
                            ? 'border-[var(--shop-accent)] bg-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)] text-[var(--shop-accent)]'
                            : 'border-[var(--shop-border-color)] text-white/80 hover:bg-white/10'
                        }`}
                      >
                        {frame === 'day'
                          ? t('analytics.timeDetailScopeDay')
                          : frame === 'week'
                            ? t('analytics.timeDetailScopeWeek')
                            : t('analytics.timeDetailScopeMonth')}
                      </button>
                    ))}
                  </div>

                  {timeDetailChartsBusy && !timeDetailChartsData ? (
                    <div className="flex items-center justify-center min-h-[280px] rounded-3xl border border-[var(--shop-border-color)] bg-[var(--shop-surface-secondary)]">
                      <LoadingSpinner size="lg" text={t('analytics.loading')} />
                    </div>
                  ) : !timeDetailChartsData ? (
                    <div className="rounded-3xl border border-[var(--shop-border-color)] bg-[var(--shop-surface-secondary)] p-8">
                      <ErrorDisplay error={new Error(t('analytics.loadError'))} />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden min-h-[380px] flex flex-col">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                          <div className="mb-2 flex items-center gap-4 flex-shrink-0">
                            <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">schedule</span>
                            <div>
                              <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                                {t('analytics.timeHourlyTitle')}
                              </h2>
                              <p className="text-sm text-white/60 mt-1">
                                {t('analytics.timeDetailPeriodLabel').replace(
                                  '{{range}}',
                                  formatTimeDetailPeriodLabel(timeDetailChartsData)
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex-1 min-h-[260px]">
                            <HourlyChart
                              data={timeDetailChartsData.hourlyDistribution}
                              peakHour={timeDetailChartsData.peakHour}
                            />
                          </div>
                        </div>

                        <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden min-h-[380px] flex flex-col">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                          <div className="mb-2 flex items-center gap-4">
                            <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">calendar_month</span>
                            <div>
                              <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                                {t('analytics.weeklyPatternTitle')}
                              </h2>
                              <p className="text-sm text-white/60 mt-1">
                                {t('analytics.timeDetailPeriodLabel').replace(
                                  '{{range}}',
                                  formatTimeDetailPeriodLabel(timeDetailChartsData)
                                )}
                              </p>
                            </div>
                          </div>
                          <DayOfWeekChart
                            data={timeDetailChartsData.dayOfWeekDistribution}
                            highlightDay={weekdayHighlightFromSelection}
                            onDayClick={onTimeWeeklyPatternDayClick}
                          />
                        </div>
                      </div>

                      <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden mt-8">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                        <div className="mb-2 flex items-center gap-4">
                          <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">trending_up</span>
                          <div>
                            <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                              {t('analytics.timeWaitTrendTitle')}
                            </h2>
                            <p className="text-sm text-white/60 mt-1">
                              {t('analytics.timeDetailPeriodLabel').replace(
                                '{{range}}',
                                formatTimeDetailPeriodLabel(timeDetailChartsData)
                              )}
                            </p>
                          </div>
                        </div>
                        <WaitTimeTrendChart
                          data={timeDetailChartsData.waitTimeTrends}
                          dataByHour={timeDetailChartsData.waitTimeTrendsByHour}
                          dataByWeek={timeDetailChartsData.waitTimeTrendsByWeek}
                          dataByMonth={timeDetailChartsData.waitTimeTrendsByMonth}
                          dataByYear={timeDetailChartsData.waitTimeTrendsByYear}
                          dailySince={dayKeyFromIso(timeDetailChartsData.period.since)}
                          dailyUntil={dayKeyFromIso(timeDetailChartsData.period.until)}
                        />
                      </div>

                      {timeDetailChartsData.peakHour && (
                        <div className="bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_15%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_5%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-3xl p-10 text-center mt-8">
                          <p className="text-sm text-white/70 uppercase tracking-wider mb-2">
                            {t('analytics.peakHourLabel')}
                          </p>
                          <p className="text-sm text-white/50 mb-4">
                            {t('analytics.timeDetailPeriodLabel').replace(
                              '{{range}}',
                              formatTimeDetailPeriodLabel(timeDetailChartsData)
                            )}
                          </p>
                          <div className="font-['Playfair_Display',serif] text-6xl font-semibold text-[var(--shop-accent)] mb-3">
                            {timeDetailChartsData.peakHour.hour}:00
                          </div>
                          <p className="text-base text-white/70">
                            {timeDetailChartsData.peakHour.count}{' '}
                            {timeDetailChartsData.peakHour.count === 1
                              ? t('analytics.attendanceOne')
                              : t('analytics.attendanceMany')}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
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
              {/* Productivity by day of week (per barber, with time frame: All time / This period) */}
              {(data.barberProductivityByDayAllTime?.length ?? 0) > 0 || (data.barberProductivityByDayInPeriod?.length ?? 0) > 0 || data.barbers.length > 0 ? (
                <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
                  <div className="mb-6 flex items-center gap-4">
                    <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">bar_chart</span>
                    <h2 className="font-['Playfair_Display',serif] text-2xl lg:text-3xl text-white">
                      {t('analytics.productivityByDayTitle')}
                    </h2>
                  </div>
                  <p className="text-sm text-white/60 mb-6">
                    {t('analytics.productivityByDayIntro')}
                  </p>
                  {productivityTimeScope === 'week' && productivityWeekLoading && (
                    <p className="text-sm text-white/60 mb-4">{t('common.loading')}</p>
                  )}
                  <BarberProductivityByDayChart
                    allTime={data.barberProductivityByDayAllTime ?? []}
                    inPeriod={data.barberProductivityByDayInPeriod}
                    weekData={productivityWeekLoading ? null : productivityWeekData}
                    weekLabel={productivityWeekLabel}
                    timeScope={productivityTimeScope}
                    onTimeScopeChange={(scope) => {
                      setProductivityTimeScope(scope);
                      if (scope === 'week' && !productivityWeekStart) setProductivityWeekStart(weekOptionsForProductivity[0]?.value ?? null);
                    }}
                    weekOptions={weekOptionsForProductivity}
                    selectedWeekStart={productivityTimeScope === 'week' ? productivityWeekStart : null}
                    onWeekSelect={setProductivityWeekStart}
                    barbers={data.barbers.map((b) => ({ id: b.id, name: b.name }))}
                    selectedBarberId={selectedBarberId}
                    onBarberChange={setSelectedBarberId}
                    dayLabels={dayLabelsShort}
                    labelAvgMinutes={t('analytics.avgMin')}
                    labelAttendances={t('analytics.attendances')}
                    labelAllTime={t('analytics.dataAllTime')}
                    labelThisPeriod={t('analytics.dataThisPeriod')}
                    labelWeek={t('analytics.week')}
                    labelWeekPrev={t('analytics.weekPrev')}
                    labelWeekNext={t('analytics.weekNext')}
                    labelAllBarbers={t('analytics.allBarbersAverage')}
                    labelBarber={t('analytics.barber')}
                  />
                </div>
              ) : null}

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
                            {(barber.avgRating != null && barber.ratingCount != null && barber.ratingCount > 0) && (
                              <div className="col-span-2 text-center pt-2 border-t border-white/10">
                                <span className="text-[var(--shop-accent)] font-semibold">{barber.avgRating.toFixed(1)}</span>
                                <span className="material-symbols-outlined text-[var(--shop-accent)] text-lg align-middle ml-0.5">star</span>
                                <span className="text-white/60 text-sm ml-1">({barber.ratingCount})</span>
                              </div>
                            )}
                          </div>
                          {barberInfo && (
                            <div className="mt-4 pt-4 border-t border-[var(--shop-border-color)]">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-white/70">{t('analytics.efficiencyServed')}</span>
                                <span className="text-white font-semibold">{barberInfo.totalServed}</span>
                              </div>
                              <div className="mt-3 text-left">
                                <p className="text-xs text-white/50 uppercase mb-2">{t('analytics.efficiencyAvgByServiceTitle')}</p>
                                {barber.serviceAverages && barber.serviceAverages.length > 0 ? (
                                  <ul className="space-y-1.5 text-sm">
                                    {barber.serviceAverages.map((s) => (
                                      <li key={s.serviceId} className="flex justify-between gap-2">
                                        <span className="text-white/80 truncate" title={s.serviceName}>
                                          {s.serviceName}
                                        </span>
                                        <span className="text-white font-medium shrink-0">
                                          {s.avgMinutes}m
                                          <span className="text-white/45 font-normal text-xs ml-1">
                                            ({s.completedCount})
                                          </span>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-white/50">{t('analytics.efficiencyAvgByServiceInsufficient')}</p>
                                )}
                                <p className="text-xs text-white/40 mt-2">{t('analytics.efficiencyAvgByServiceNote')}</p>
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
                        className="bg-[rgba(36,36,36,0.8)] border border-[var(--shop-border-color)] rounded-2xl p-6 flex flex-col gap-4"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] rounded-full flex items-center justify-center text-2xl font-semibold text-[var(--shop-text-on-accent)] flex-shrink-0">
                            {barber.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xl text-white truncate">{barber.name}</h4>
                            <div className="flex flex-wrap gap-4 mt-2">
                              <div className="text-center">
                                <div className="font-['Playfair_Display',serif] text-xl font-semibold text-[var(--shop-accent)]">
                                  {barber.totalServed}
                                </div>
                                <div className="text-xs text-white/50 uppercase">Atendidos</div>
                              </div>
                              <div className="text-center">
                                <div className="font-['Playfair_Display',serif] text-xl font-semibold text-[var(--shop-accent)]">
                                  {barber.avgServiceTime}m
                                </div>
                                <div className="text-xs text-white/50 uppercase">Média</div>
                              </div>
                              {barber.totalActivityMinutes != null && (
                                <div className="text-center">
                                  <div className="font-['Playfair_Display',serif] text-xl font-semibold text-white">
                                    {formatActivityMinutes(barber.totalActivityMinutes)}
                                  </div>
                                  <div className="text-xs text-white/50 uppercase">{t('analytics.timeOfActivity')}</div>
                                </div>
                              )}
                              <div className="text-center">
                                <div className="font-['Playfair_Display',serif] text-xl font-semibold text-white">
                                  {barber.avgWorkTimeMinutesSinceMonthStart != null
                                    ? `${barber.avgWorkTimeMinutesSinceMonthStart} ${t('analytics.minPerDay')}`
                                    : '—'}
                                </div>
                                <div className="text-xs text-white/50 uppercase">{t('analytics.avgWorkTimeThisMonth')}</div>
                              </div>
                              {barber.avgRating != null && barber.ratingCount != null && barber.ratingCount > 0 && (
                                <div className="text-center">
                                  <div className="font-['Playfair_Display',serif] text-xl font-semibold text-[var(--shop-accent)] flex items-center justify-center gap-0.5">
                                    {barber.avgRating.toFixed(1)}
                                    <span className="material-symbols-outlined text-lg">star</span>
                                  </div>
                                  <div className="text-xs text-white/50 uppercase">{t('analytics.ratings')} ({barber.ratingCount})</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setHistoryBarber({ id: barber.id, name: barber.name }); setHistoryPage(1); }}
                            className="flex-1 py-2.5 rounded-xl border border-[var(--shop-border-color)] text-white/90 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-lg">history</span>
                            {t('analytics.viewHistory')}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDownloadBarberModal({ id: barber.id, name: barber.name }); setDownloadRange('full'); setDownloadSince(''); setDownloadUntil(''); }}
                            className="py-2.5 px-4 rounded-xl border border-[var(--shop-border-color)] text-white/90 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                            title={t('analytics.downloadServiceHistory')}
                          >
                            <span className="material-symbols-outlined text-lg">download</span>
                            {t('analytics.download')}
                          </button>
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
                  {t('analytics.cancellationAnalysisTitle')}
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
                            <span className="text-white font-medium">{g.gender === 'unknown' ? t('account.genderUnknown') : g.gender === 'male' ? t('account.genderMale') : g.gender === 'female' ? t('account.genderFemale') : g.gender}</span>
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
                          <h4 className="text-lg text-white truncate font-medium">{client.name ? formatNameForDisplay(client.name) : 'Cliente'}</h4>
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

        {downloadBarberModal != null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="download-barber-history-title"
          >
            <div
              ref={downloadDialogRef}
              className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl shadow-xl max-w-md w-full p-6"
            >
              <h2 id="download-barber-history-title" className="font-['Playfair_Display',serif] text-xl text-white mb-4">
                {t('analytics.downloadServiceHistory')} – {downloadBarberModal.name}
              </h2>
              <div className="space-y-4 mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="downloadRange"
                    checked={downloadRange === 'full'}
                    onChange={() => setDownloadRange('full')}
                    className="text-[var(--shop-accent)]"
                  />
                  <span className="text-white/90">{t('analytics.downloadFullHistory')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="downloadRange"
                    checked={downloadRange === 'partial'}
                    onChange={() => setDownloadRange('partial')}
                    className="text-[var(--shop-accent)]"
                  />
                  <span className="text-white/90">{t('analytics.downloadDateRange')}</span>
                </label>
                {downloadRange === 'partial' && (
                  <div className="flex flex-wrap gap-3 pl-6">
                    <div>
                      <label className="block text-xs text-white/50 mb-1">{t('analytics.downloadFrom')}</label>
                      <input
                        type="date"
                        value={downloadSince}
                        onChange={(e) => setDownloadSince(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--shop-surface-primary)] border border-[var(--shop-border-color)] text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">{t('analytics.downloadTo')}</label>
                      <input
                        type="date"
                        value={downloadUntil}
                        onChange={(e) => setDownloadUntil(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--shop-surface-primary)] border border-[var(--shop-border-color)] text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDownloadBarberModal(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--shop-border-color)] text-white/90 hover:bg-white/5 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={downloadCsvLoading || (downloadRange === 'partial' && (!downloadSince || !downloadUntil))}
                  onClick={async () => {
                    if (!shopSlug || !downloadBarberModal) return;
                    setDownloadCsvLoading(true);
                    try {
                      const options =
                        downloadRange === 'partial' && downloadSince && downloadUntil
                          ? { since: downloadSince, until: downloadUntil }
                          : undefined;
                      await downloadBarberServiceHistoryCsv(
                        api.getBarberServiceHistory.bind(api),
                        shopSlug,
                        downloadBarberModal.id,
                        downloadBarberModal.name,
                        {
                          date: t('analytics.historyDate'),
                          service: t('analytics.service'),
                          client: t('analytics.historyClient'),
                          status: t('analytics.historyStatus'),
                          duration: t('analytics.historyDuration'),
                        },
                        options
                      );
                      setDownloadBarberModal(null);
                    } finally {
                      setDownloadCsvLoading(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {downloadCsvLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      {t('analytics.downloading')}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">download</span>
                      {t('analytics.downloadCsv')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {historyBarber != null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="barber-history-title"
          >
            <div
              ref={historyDialogRef}
              className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-[var(--shop-border-color)]">
                <h2 id="barber-history-title" className="font-['Playfair_Display',serif] text-xl text-white">
                  {t('analytics.serviceHistory')} – {historyBarber.name}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={downloadCsvLoading}
                    onClick={async () => {
                      if (!shopSlug) return;
                      setDownloadCsvLoading(true);
                      try {
                        await downloadBarberServiceHistoryCsv(
                          api.getBarberServiceHistory.bind(api),
                          shopSlug,
                          historyBarber.id,
                          historyBarber.name,
                          {
                            date: t('analytics.historyDate'),
                            service: t('analytics.service'),
                            client: t('analytics.historyClient'),
                            status: t('analytics.historyStatus'),
                            duration: t('analytics.historyDuration'),
                          },
                          undefined
                        );
                      } finally {
                        setDownloadCsvLoading(false);
                      }
                    }}
                    className="py-2 px-3 rounded-xl border border-[var(--shop-border-color)] text-white/90 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {downloadCsvLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <span className="material-symbols-outlined text-lg">download</span>
                    )}
                    {t('analytics.downloadCsv')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setHistoryBarber(null); setHistoryPage(1); }}
                    className="p-2 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    aria-label={t('common.close')}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="md" />
                  </div>
                ) : historyData && historyData.tickets.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="text-white/50 border-b border-[var(--shop-border-color)]">
                            <th className="py-2 pr-4">{t('analytics.historyDate')}</th>
                            <th className="py-2 pr-4">{t('analytics.historyClient')}</th>
                            <th className="py-2 pr-4">{t('analytics.service')}</th>
                            <th className="py-2 pr-4">{t('analytics.historyStatus')}</th>
                            <th className="py-2 text-right">{t('analytics.historyDuration')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.tickets.map((ticket) => (
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
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={historyPage <= 1}
                        className="px-4 py-2 rounded-xl bg-[var(--shop-surface-primary)] border border-[var(--shop-border-color)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                      >
                        {t('common.back')}
                      </button>
                      <span className="text-white/70 text-sm">
                        {historyPage} / {Math.ceil(historyData.total / 25) || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setHistoryPage((p) => p + 1)}
                        disabled={historyPage * 25 >= historyData.total}
                        className="px-4 py-2 rounded-xl bg-[var(--shop-surface-primary)] border border-[var(--shop-border-color)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                      >
                        {t('common.next')}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-white/50 py-12">{t('common.noDataAvailable')}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
