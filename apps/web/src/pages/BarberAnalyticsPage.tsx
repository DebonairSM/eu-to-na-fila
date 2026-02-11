import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Container, Heading, Text, Card, CardContent } from '@/components/design-system';
import { useLocale } from '@/contexts/LocaleContext';
import { formatCurrency, formatDate } from '@/lib/format';

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
}

export function BarberAnalyticsPage() {
  const shopSlug = useShopSlug();
  const { isBarber, user } = useAuthContext();
  const { locale, t } = useLocale();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<BarberAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

  const { summary, ticketsByDay, serviceBreakdown, dayOfWeekDistribution } = data;
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
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white text-sm"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={14}>Últimos 14 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card variant="default" className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <Text size="sm" variant="secondary" className="uppercase tracking-wider">
                  Atendimentos
                </Text>
                <p className="text-2xl font-bold text-[var(--shop-accent)] mt-1">{summary.completed}</p>
              </CardContent>
            </Card>
            <Card variant="default" className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <Text size="sm" variant="secondary" className="uppercase tracking-wider">
                  Faturamento
                </Text>
                <p className="text-2xl font-bold text-[var(--shop-accent)] mt-1">{formatCurrency(summary.revenueCents, locale)}</p>
              </CardContent>
            </Card>
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
                        {formatDate(new Date(day + 'T12:00:00'), locale, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
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
                        {s.revenueCents != null && s.revenueCents > 0 && (
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
        </div>
      </Container>
    </div>
  );
}
