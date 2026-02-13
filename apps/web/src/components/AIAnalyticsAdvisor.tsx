import { useMemo } from 'react';
import { DAY_NAMES_PT_FULL } from '@/lib/constants';
import { formatDurationMinutes } from '@/lib/formatDuration';

interface AnalyticsData {
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
  type: 'insight' | 'prediction' | 'recommendation';
  category: 'traffic' | 'efficiency' | 'cancellation' | 'staffing' | 'growth';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  icon: string;
}

export function AIAnalyticsAdvisor({ data }: AIAnalyticsAdvisorProps) {
  const insights = useMemo(() => {
    const result: Insight[] = [];
    const { summary, barbers, peakHour, serviceBreakdown, cancellationAnalysis, barberEfficiency, trends } = data;

    // Cancellation Analysis
    if (summary.cancellationRate > 20) {
      result.push({
        type: 'recommendation',
        category: 'cancellation',
        severity: 'critical',
        title: 'Taxa de cancelamento alta',
        message: `${summary.cancellationRate}% dos tickets foram cancelados. Considere revisar estimativas de tempo de espera ou qualidade do serviço.`,
        icon: 'warning',
      });
    } else if (summary.cancellationRate > 10) {
      result.push({
        type: 'insight',
        category: 'cancellation',
        severity: 'warning',
        title: 'Taxa de cancelamento moderada',
        message: `${summary.cancellationRate}% de cancelamentos. Monitore padrões para identificar causas.`,
        icon: 'info',
      });
    }

    if (cancellationAnalysis.avgTimeBeforeCancellation > 30) {
      result.push({
        type: 'insight',
        category: 'cancellation',
        severity: 'warning',
        title: 'Cancelamentos tardios',
        message: `Clientes cancelam em média após ${formatDurationMinutes(cancellationAnalysis.avgTimeBeforeCancellation)}. Considere melhorar comunicação sobre tempo de espera.`,
        icon: 'schedule',
      });
    }

    // Peak Hour Staffing
    if (peakHour) {
      const presentBarbers = barbers.filter(b => b.isPresent).length;
      const peakHourTraffic = peakHour.count;
      const avgBarberCapacity = summary.avgPerDay / Math.max(presentBarbers, 1);
      
      if (peakHourTraffic > avgBarberCapacity * 1.5 && presentBarbers < 2) {
        result.push({
          type: 'recommendation',
          category: 'staffing',
          severity: 'warning',
          title: 'Pico de demanda',
          message: `Horário ${peakHour.hour}:00 tem ${peakHourTraffic} atendimentos. Considere adicionar mais barbeiros neste horário.`,
          icon: 'groups',
        });
      }
    }

    // Service Time Analysis
    if (summary.avgServiceTime > 30) {
      result.push({
        type: 'recommendation',
        category: 'efficiency',
        severity: 'warning',
        title: 'Tempo de serviço elevado',
        message: `Tempo médio de ${formatDurationMinutes(summary.avgServiceTime)} por atendimento. Considere otimizar processos.`,
        icon: 'timer',
      });
    } else if (summary.avgServiceTime < 15 && summary.avgServiceTime > 0) {
      result.push({
        type: 'insight',
        category: 'efficiency',
        severity: 'info',
        title: 'Eficiência alta',
        message: `Tempo médio de ${formatDurationMinutes(summary.avgServiceTime)} indica boa eficiência operacional.`,
        icon: 'check_circle',
      });
    }

    // Traffic Trends
    if (trends.weekOverWeek < -10) {
      result.push({
        type: 'recommendation',
        category: 'growth',
        severity: 'warning',
        title: 'Queda no tráfego',
        message: `Tráfego ${Math.abs(trends.weekOverWeek)}% menor que o período anterior. Revise estratégias de marketing ou ofertas.`,
        icon: 'trending_down',
      });
    } else if (trends.weekOverWeek > 10) {
      result.push({
        type: 'insight',
        category: 'growth',
        severity: 'info',
        title: 'Crescimento positivo',
        message: `Tráfego ${trends.weekOverWeek}% maior que o período anterior. Continue monitorando para manter o crescimento.`,
        icon: 'trending_up',
      });
    }

    // Barber Performance
    const topBarber = barberEfficiency.sort((a, b) => b.ticketsPerDay - a.ticketsPerDay)[0];
    const lowBarber = barberEfficiency.filter(b => b.ticketsPerDay > 0).sort((a, b) => a.ticketsPerDay - b.ticketsPerDay)[0];
    
    if (topBarber && lowBarber && topBarber.ticketsPerDay > lowBarber.ticketsPerDay * 2) {
      result.push({
        type: 'insight',
        category: 'efficiency',
        severity: 'info',
        title: 'Disparidade de desempenho',
        message: `${topBarber.name} atende ${topBarber.ticketsPerDay.toFixed(1)} tickets/dia, enquanto ${lowBarber.name} atende ${lowBarber.ticketsPerDay.toFixed(1)}. Considere balancear a distribuição.`,
        icon: 'balance',
      });
    }

    // Service Popularity
    if (serviceBreakdown.length > 0) {
      const topService = serviceBreakdown[0];
      if (topService.percentage > 60) {
        result.push({
          type: 'insight',
          category: 'traffic',
          severity: 'info',
          title: 'Serviço dominante',
          message: `${topService.serviceName} representa ${topService.percentage}% dos atendimentos. Considere promover outros serviços.`,
          icon: 'star',
        });
      }
    }

    // Day of Week Patterns
    const dayEntries = Object.entries(data.dayOfWeekDistribution);
    const maxDay = dayEntries.reduce((max, [day, count]) => count > max.count ? { day, count } : max, { day: '', count: 0 });
    const minDay = dayEntries.reduce((min, [day, count]) => count < min.count && count > 0 ? { day, count } : min, { day: '', count: Infinity });
    
    if (maxDay.count > minDay.count * 2 && minDay.count > 0) {
      const maxDayPt = DAY_NAMES_PT_FULL[maxDay.day] ?? maxDay.day;
      const minDayPt = DAY_NAMES_PT_FULL[minDay.day] ?? minDay.day;
      result.push({
        type: 'insight',
        category: 'traffic',
        severity: 'info',
        title: 'Padrão semanal',
        message: `${maxDayPt} é o dia mais movimentado (${maxDay.count} tickets), enquanto ${minDayPt} é o mais calmo (${minDay.count}).`,
        icon: 'calendar_month',
      });
    }

    // Completion Rate
    if (summary.completionRate < 70) {
      result.push({
        type: 'recommendation',
        category: 'efficiency',
        severity: 'warning',
        title: 'Taxa de conclusão baixa',
        message: `Apenas ${summary.completionRate}% dos tickets são concluídos. Revise processos para melhorar a conclusão.`,
        icon: 'error',
      });
    } else if (summary.completionRate > 90) {
      result.push({
        type: 'insight',
        category: 'efficiency',
        severity: 'info',
        title: 'Alta taxa de conclusão',
        message: `${summary.completionRate}% de conclusão indica boa retenção de clientes.`,
        icon: 'check_circle',
      });
    }

    // Predictions
    const avgDailyTraffic = summary.avgPerDay;
    const predictedNextWeek = Math.round(avgDailyTraffic * 7);
    result.push({
      type: 'prediction',
      category: 'traffic',
      severity: 'info',
      title: 'Previsão próxima semana',
      message: `Baseado nos padrões atuais, espera-se aproximadamente ${predictedNextWeek} atendimentos na próxima semana.`,
      icon: 'auto_awesome',
    });

    if (peakHour) {
      const recommendedStaffing = Math.ceil(peakHour.count / (summary.avgServiceTime || 30) * 60);
      result.push({
        type: 'prediction',
        category: 'staffing',
        severity: 'info',
        title: 'Recomendação de equipe',
        message: `Para o horário de pico (${peakHour.hour}:00), recomenda-se ${Math.max(recommendedStaffing, 2)} barbeiros presentes.`,
        icon: 'people',
      });
    }

    return result;
  }, [data]);

  const insightsByType = {
    insight: insights.filter(i => i.type === 'insight'),
    prediction: insights.filter(i => i.type === 'prediction'),
    recommendation: insights.filter(i => i.type === 'recommendation'),
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-[#ef4444] bg-[rgba(239,68,68,0.1)]';
      case 'warning':
        return 'border-[#f59e0b] bg-[rgba(245,158,11,0.1)]';
      default:
        return 'border-[#3b82f6] bg-[rgba(59,130,246,0.1)]';
    }
  };

  const getSeverityIconColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-[#ef4444]';
      case 'warning':
        return 'text-[#f59e0b]';
      default:
        return 'text-[#3b82f6]';
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#242424] border border-[rgba(255,255,255,0.05)] rounded-3xl p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E8C547]" />
      <div className="mb-6 flex items-center gap-4">
        <span className="material-symbols-outlined text-[#D4AF37] text-3xl">auto_awesome</span>
        <h2 className="font-['Playfair_Display',serif] text-3xl text-white">
          Assistente de Analytics
        </h2>
      </div>

      <div className="space-y-6">
        {insightsByType.recommendation.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#D4AF37]">lightbulb</span>
              Recomendações
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
                      <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                      <p className="text-sm text-white/70">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {insightsByType.prediction.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#D4AF37]">trending_up</span>
              Previsões
            </h3>
            <div className="space-y-3">
              {insightsByType.prediction.map((insight, idx) => (
                <div
                  key={`pred-${idx}`}
                  className={`p-4 rounded-xl border-2 ${getSeverityColor(insight.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`material-symbols-outlined ${getSeverityIconColor(insight.severity)} flex-shrink-0`}>
                      {insight.icon}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                      <p className="text-sm text-white/70">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {insightsByType.insight.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#D4AF37]">insights</span>
              Insights
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
                      <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                      <p className="text-sm text-white/70">{insight.message}</p>
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

