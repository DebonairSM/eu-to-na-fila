import { useMemo } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { formatDurationMinutes } from '@/lib/formatDuration';

interface AnalyticsData {
  period?: {
    days: number;
    since: string;
    until: string;
    calendarDays?: number;
    openDays?: number;
  };
  summary: {
    total: number;
    completed: number;
    cancelled: number;
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
  peakHour: { hour: number; count: number } | null;
  serviceBreakdown: Array<{ serviceId: number; serviceName: string; count: number; percentage: number }>;
  dayOfWeekDistribution: Record<string, number>;
  cancellationAnalysis: {
    rateByDay: Record<string, number>;
    rateByHour: Record<number, number>;
    avgTimeBeforeCancellation: number;
  };
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

interface AIAnalyticsAdvisorProps {
  data: AnalyticsData;
}

interface Insight {
  type: 'insight' | 'recommendation';
  category: 'traffic' | 'efficiency' | 'cancellation' | 'staffing' | 'growth';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  icon: string;
}

const MIN_TICKETS_FOR_HEURISTICS = 5;

function strVars(vars: Record<string, string | number>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    o[k] = String(v);
  }
  return o;
}

export function AIAnalyticsAdvisor({ data }: AIAnalyticsAdvisorProps) {
  const { t } = useLocale();
  const insights = useMemo(() => {
    const result: Insight[] = [];
    const { summary, peakHour, serviceBreakdown, cancellationAnalysis, barberEfficiency, trends, period } = data;
    const total = summary.total;
    const openDays = period?.openDays ?? period?.days;
    const calendarDays = period?.calendarDays ?? openDays;

    // Factual period summary (API avg/day uses open days when available)
    if (total > 0 && period && openDays != null && openDays > 0) {
      result.push({
        type: 'insight',
        category: 'traffic',
        severity: 'info',
        title: t('analytics.advisor.periodFactsTitle'),
        message: t(
          'analytics.advisor.periodFactsBody',
          strVars({
            total,
            openDays,
            avgPerDay: Number(summary.avgPerDay.toFixed(1)),
            calendarDays: calendarDays ?? openDays,
          })
        ),
        icon: 'summarize',
      });
    }

    if (total < MIN_TICKETS_FOR_HEURISTICS) {
      return result;
    }

    if (summary.cancellationRate > 20) {
      result.push({
        type: 'recommendation',
        category: 'cancellation',
        severity: 'critical',
        title: t('analytics.advisor.cancellationHighTitle'),
        message: t(
          'analytics.advisor.cancellationHighBody',
          strVars({ rate: summary.cancellationRate, cancelled: summary.cancelled, total })
        ),
        icon: 'warning',
      });
    } else if (summary.cancellationRate > 10) {
      result.push({
        type: 'insight',
        category: 'cancellation',
        severity: 'warning',
        title: t('analytics.advisor.cancellationModerateTitle'),
        message: t('analytics.advisor.cancellationModerateBody', strVars({ rate: summary.cancellationRate })),
        icon: 'info',
      });
    }

    if (summary.cancelled > 0 && cancellationAnalysis.avgTimeBeforeCancellation > 30) {
      result.push({
        type: 'insight',
        category: 'cancellation',
        severity: 'warning',
        title: t('analytics.advisor.lateCancelTitle'),
        message: t(
          'analytics.advisor.lateCancelBody',
          strVars({
            minutes: formatDurationMinutes(cancellationAnalysis.avgTimeBeforeCancellation),
            cancelled: summary.cancelled,
          })
        ),
        icon: 'schedule',
      });
    }

    if (peakHour && total > 0) {
      const share = Math.round((peakHour.count / total) * 100);
      result.push({
        type: 'insight',
        category: 'traffic',
        severity: 'info',
        title: t('analytics.advisor.peakHourTitle'),
        message: t(
          'analytics.advisor.peakHourBody',
          strVars({
            hour: String(peakHour.hour).padStart(2, '0'),
            count: peakHour.count,
            share,
            total,
          })
        ),
        icon: 'schedule',
      });
    }

    if (summary.completed > 0 && summary.avgServiceTime > 0) {
      result.push({
        type: 'insight',
        category: 'efficiency',
        severity: 'info',
        title: t('analytics.advisor.serviceTimeTitle'),
        message: t(
          'analytics.advisor.serviceTimeBody',
          strVars({
            minutes: formatDurationMinutes(summary.avgServiceTime),
            completed: summary.completed,
          })
        ),
        icon: 'timer',
      });
    }

    if (trends.weekOverWeek !== 0) {
      if (trends.weekOverWeek < -10) {
        result.push({
          type: 'recommendation',
          category: 'growth',
          severity: 'warning',
          title: t('analytics.advisor.wowDownTitle'),
          message: t('analytics.advisor.wowDownBody', strVars({ pct: Math.abs(trends.weekOverWeek) })),
          icon: 'trending_down',
        });
      } else if (trends.weekOverWeek > 10) {
        result.push({
          type: 'insight',
          category: 'growth',
          severity: 'info',
          title: t('analytics.advisor.wowUpTitle'),
          message: t('analytics.advisor.wowUpBody', strVars({ pct: trends.weekOverWeek })),
          icon: 'trending_up',
        });
      }
    }

    const effSorted = [...barberEfficiency].sort((a, b) => b.ticketsPerDay - a.ticketsPerDay);
    const topBarber = effSorted[0];
    const withVolume = barberEfficiency.filter((b) => b.ticketsPerDay > 0);
    const lowBarber = [...withVolume].sort((a, b) => a.ticketsPerDay - b.ticketsPerDay)[0];

    if (topBarber && lowBarber && withVolume.length >= 2 && topBarber.id !== lowBarber.id) {
      if (topBarber.ticketsPerDay > lowBarber.ticketsPerDay * 2) {
        result.push({
          type: 'insight',
          category: 'efficiency',
          severity: 'info',
          title: t('analytics.advisor.barberGapTitle'),
          message: t(
            'analytics.advisor.barberGapBody',
            strVars({
              topName: topBarber.name,
              topTpd: topBarber.ticketsPerDay.toFixed(1),
              lowName: lowBarber.name,
              lowTpd: lowBarber.ticketsPerDay.toFixed(1),
            })
          ),
          icon: 'balance',
        });
      }
    }

    if (serviceBreakdown.length > 0) {
      const topService = serviceBreakdown[0];
      if (topService.percentage > 60) {
        result.push({
          type: 'insight',
          category: 'traffic',
          severity: 'info',
          title: t('analytics.advisor.serviceDominantTitle'),
          message: t(
            'analytics.advisor.serviceDominantBody',
            strVars({
              name: topService.serviceName,
              pct: topService.percentage,
              count: topService.count,
              total,
            })
          ),
          icon: 'star',
        });
      }
    }

    const dayPositive = Object.entries(data.dayOfWeekDistribution).filter(([, c]) => c > 0);
    if (dayPositive.length >= 2) {
      const sorted = [...dayPositive].sort((a, b) => b[1] - a[1]);
      const maxDay = { day: sorted[0][0], count: sorted[0][1] };
      const minEntry = sorted[sorted.length - 1];
      const minDay = { day: minEntry[0], count: minEntry[1] };
      if (maxDay.count > minDay.count * 2) {
        const maxDayLabel = t(`common.dayFull.${maxDay.day}`) || maxDay.day;
        const minDayLabel = t(`common.dayFull.${minDay.day}`) || minDay.day;
        result.push({
          type: 'insight',
          category: 'traffic',
          severity: 'info',
          title: t('analytics.weeklyPatternTitle'),
          message: t('analytics.weeklyPatternMessage')
            .replace('{busiest}', maxDayLabel)
            .replace('{busiestCount}', String(maxDay.count))
            .replace('{quietest}', minDayLabel)
            .replace('{quietestCount}', String(minDay.count)),
          icon: 'calendar_month',
        });
      }
    }

    if (summary.completionRate < 70) {
      result.push({
        type: 'recommendation',
        category: 'efficiency',
        severity: 'warning',
        title: t('analytics.advisor.completionLowTitle'),
        message: t(
          'analytics.advisor.completionLowBody',
          strVars({ rate: summary.completionRate, completed: summary.completed, total })
        ),
        icon: 'error',
      });
    } else if (summary.completionRate > 90) {
      result.push({
        type: 'insight',
        category: 'efficiency',
        severity: 'info',
        title: t('analytics.advisor.completionHighTitle'),
        message: t(
          'analytics.advisor.completionHighBody',
          strVars({ rate: summary.completionRate, completed: summary.completed, total })
        ),
        icon: 'check_circle',
      });
    }

    return result;
  }, [data, t]);

  const insightsByType = {
    insight: insights.filter((i) => i.type === 'insight'),
    recommendation: insights.filter((i) => i.type === 'recommendation'),
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-[#ef4444] bg-[rgba(239,68,68,0.1)]';
      case 'warning':
        return 'border-[#f59e0b] bg-[rgba(245,158,11,0.1)]';
      default:
        return 'border-[color-mix(in_srgb,var(--shop-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--shop-accent)_12%,transparent)]';
    }
  };

  const getSeverityIconColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-[#ef4444]';
      case 'warning':
        return 'text-[#f59e0b]';
      default:
        return 'text-[var(--shop-accent)]';
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] rounded-3xl p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)]" />
      <div className="mb-6 flex items-center gap-4">
        <span className="material-symbols-outlined text-[var(--shop-accent)] text-3xl">auto_awesome</span>
        <h2 className="font-['Playfair_Display',serif] text-3xl text-[var(--shop-text-primary)]">
          {t('analytics.advisorTitle')}
        </h2>
      </div>

      <div className="space-y-6">
        {insightsByType.recommendation.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-[var(--shop-text-primary)] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--shop-accent)]">lightbulb</span>
              {t('analytics.advisor.sectionRecommendations')}
            </h3>
            <div className="space-y-3">
              {insightsByType.recommendation.map((insight, idx) => (
                <div
                  key={`rec-${idx}`}
                  className={`p-4 rounded-xl border-2 ${getSeverityColor(insight.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`material-symbols-outlined ${getSeverityIconColor(insight.severity)} flex-shrink-0`}>
                      {insight.icon}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[var(--shop-text-primary)] mb-1">{insight.title}</h4>
                      <p className="text-sm text-[var(--shop-text-secondary)]">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {insightsByType.insight.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-[var(--shop-text-primary)] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--shop-accent)]">insights</span>
              {t('analytics.advisor.sectionInsights')}
            </h3>
            <div className="space-y-3">
              {insightsByType.insight.map((insight, idx) => (
                <div
                  key={`insight-${idx}`}
                  className={`p-4 rounded-xl border-2 ${getSeverityColor(insight.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`material-symbols-outlined ${getSeverityIconColor(insight.severity)} flex-shrink-0`}>
                      {insight.icon}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[var(--shop-text-primary)] mb-1">{insight.title}</h4>
                      <p className="text-sm text-[var(--shop-text-secondary)]">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
