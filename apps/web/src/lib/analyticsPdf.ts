import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/** jsPDF default fonts do not support accents; normalize to ASCII for correct PDF rendering. */
function normalizeForPdf(text: string): string {
  if (!text) return text;
  return (
    text
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[ºª]/g, '')
      .trim() || text
  );
}

const DAY_TO_ISO: Record<string, string> = {
  Sunday: '2024-01-07',
  Monday: '2024-01-01',
  Tuesday: '2024-01-02',
  Wednesday: '2024-01-03',
  Thursday: '2024-01-04',
  Friday: '2024-01-05',
  Saturday: '2024-01-06',
};

const NEW_PAGE_Y = 240;

function formatDateForPdf(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function dayNameForPdf(dayKey: string, locale: string): string {
  const iso = DAY_TO_ISO[dayKey];
  if (!iso) return dayKey;
  return new Date(iso).toLocaleDateString(locale, { weekday: 'long' });
}

function ensureSpace(doc: jsPDF, y: number): number {
  if (y > NEW_PAGE_Y) {
    doc.addPage();
    return 20;
  }
  return y;
}

export interface AnalyticsDataForPdf {
  period: { days: number; since: string; until: string };
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    waiting?: number;
    inProgress?: number;
    pending?: number;
    completionRate: number;
    cancellationRate: number;
    avgPerDay: number;
    avgServiceTime: number;
    revenueCents?: number;
  };
  barbers: Array<{ name: string; totalServed: number; avgServiceTime: number }>;
  serviceBreakdown: Array<{ serviceName: string; count: number; percentage: number }>;
  dayOfWeekDistribution: Record<string, number>;
  cancellationAnalysis: { avgTimeBeforeCancellation: number };
  barberEfficiency: Array<{ name: string; ticketsPerDay: number; completionRate: number }>;
  waiting?: number;
  inProgress?: number;
  pending?: number;
  peakHour?: { hour: number; count: number } | null;
  ticketsByDay?: Record<string, number>;
  hourlyDistribution?: Record<number, number>;
  waitTimeTrends?: Record<string, number>;
  waitTimeTrendsByHour?: Record<string, number>;
  waitTimeTrendsByWeek?: Record<string, number>;
  waitTimeTrendsByMonth?: Record<string, number>;
  waitTimeTrendsByYear?: Record<string, number>;
  revenueByDay?: Record<string, number>;
  typeBreakdown?: {
    walkin: number;
    appointment: number;
    walkinPercent: number;
    appointmentPercent: number;
  };
  typeByDay?: Record<string, { walkin: number; appointment: number }>;
  clientMetrics?: { uniqueClients: number; newClients: number; returningClients: number; repeatRate: number };
  preferredBarberFulfillment?: { requested: number; fulfilled: number; rate: number };
  appointmentMetrics?: { total: number; noShows: number; noShowRate: number; avgMinutesLate: number; onTimeCount: number } | null;
  demographics?: {
    locationBreakdown: { city: string; state?: string; count: number }[];
    genderBreakdown: { gender: string; count: number }[];
    ageBreakdown: { range: string; count: number }[];
    styleBreakdown: { style: string; count: number }[];
  };
  trends?: {
    weekOverWeek: number;
    last7DaysComparison: Array<{ day: string; change: number }>;
  };
  correlations?: { ruleBased: string[]; llmInsights?: string[] };
}

export type AnalyticsPdfLabels = {
  title?: string;
  period?: string;
  summary?: string;
  metric?: string;
  value?: string;
  totalTickets?: string;
  completed?: string;
  cancelled?: string;
  completionRate?: string;
  cancellationRate?: string;
  avgPerDay?: string;
  avgServiceTime?: string;
  revenue?: string;
  barbers?: string;
  barber?: string;
  served?: string;
  avgMinutes?: string;
  services?: string;
  service?: string;
  quantity?: string;
  attendancesByDayOfWeek?: string;
  day?: string;
  attendances?: string;
  cancellations?: string;
  avgTimeBeforeCancellation?: string;
  efficiencyByBarber?: string;
  ticketsPerDay?: string;
  completionRatePct?: string;
  comparisons?: string;
  operationalMix?: string;
  queueState?: string;
  waiting?: string;
  inProgress?: string;
  pending?: string;
  peakHour?: string;
  demandByHour?: string;
  waitByHour?: string;
  cancellationByHour?: string;
  servicesRevenueMix?: string;
  barbersDetailed?: string;
  ratings?: string;
  activityMinutes?: string;
  avgWorkPerOpenDay?: string;
  clients?: string;
  demographics?: string;
  appointments?: string;
  noShowRate?: string;
  avgMinutesLate?: string;
  onTimeCount?: string;
  preferredBarber?: string;
  trends?: string;
  dailyTimeline?: string;
  date?: string;
  tickets?: string;
  waitAvgMin?: string;
  walkin?: string;
  appointment?: string;
  weeklyWaitTrend?: string;
  monthlyWaitTrend?: string;
  yearlyWaitTrend?: string;
  insights?: string;
  topMovers7d?: string;
  serviceSharePct?: string;
  revenueSharePct?: string;
};

const DEFAULT_PDF_LABELS_PT: Required<AnalyticsPdfLabels> = {
  title: 'Relatório de desempenho',
  period: 'Período',
  summary: 'Resumo',
  metric: 'Métrica',
  value: 'Valor',
  totalTickets: 'Total de tickets',
  completed: 'Concluídos',
  cancelled: 'Cancelados',
  completionRate: 'Taxa de conclusão',
  cancellationRate: 'Taxa de cancelamento',
  avgPerDay: 'Média por dia',
  avgServiceTime: 'Tempo médio de serviço',
  revenue: 'Receita',
  barbers: 'Barbeiros',
  barber: 'Barbeiro',
  served: 'Atendidos',
  avgMinutes: 'Tempo médio (min)',
  services: 'Serviços',
  service: 'Serviço',
  quantity: 'Quantidade',
  attendancesByDayOfWeek: 'Atendimentos por dia da semana',
  day: 'Dia',
  attendances: 'Atendimentos',
  cancellations: 'Cancelamentos',
  avgTimeBeforeCancellation: 'Tempo médio até cancelamento',
  efficiencyByBarber: 'Eficiência por barbeiro',
  ticketsPerDay: 'Tickets/dia',
  completionRatePct: 'Taxa conclusão %',
  comparisons: 'Comparativos do período',
  operationalMix: 'Mix operacional',
  queueState: 'Estado da fila',
  waiting: 'Aguardando',
  inProgress: 'Em andamento',
  pending: 'Pendentes',
  peakHour: 'Pico por hora',
  demandByHour: 'Demanda por hora',
  waitByHour: 'Espera média por hora (min)',
  cancellationByHour: 'Cancelamento por hora (%)',
  servicesRevenueMix: 'Serviços e participação na receita',
  barbersDetailed: 'Performance detalhada por barbeiro',
  ratings: 'Avaliação média',
  activityMinutes: 'Minutos ativos',
  avgWorkPerOpenDay: 'Média de trabalho por dia aberto (min)',
  clients: 'Clientes',
  demographics: 'Demografia',
  appointments: 'Agendamentos',
  noShowRate: 'No-show %',
  avgMinutesLate: 'Média de atraso (min)',
  onTimeCount: 'Chegadas no horário',
  preferredBarber: 'Preferência de barbeiro',
  trends: 'Tendências',
  dailyTimeline: 'Linha diária',
  date: 'Data',
  tickets: 'Tickets',
  waitAvgMin: 'Espera média (min)',
  walkin: 'Walk-in',
  appointment: 'Agendamento',
  weeklyWaitTrend: 'Tendência semanal de espera',
  monthlyWaitTrend: 'Tendência mensal de espera',
  yearlyWaitTrend: 'Tendência anual de espera',
  insights: 'Insights acionáveis',
  topMovers7d: 'Variações dos últimos 7 dias',
  serviceSharePct: 'Participação %',
  revenueSharePct: 'Participação receita %',
};

function pct(part: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function toMoney(cents: number, locale: string): string {
  return `R$ ${(cents / 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function topEntries<T extends string | number>(entries: Array<[T, number]>, n: number): Array<[T, number]> {
  return [...entries].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function bottomEntries<T extends string | number>(entries: Array<[T, number]>, n: number): Array<[T, number]> {
  return [...entries].sort((a, b) => a[1] - b[1]).slice(0, n);
}

export function downloadAnalyticsPdf(
  data: AnalyticsDataForPdf,
  options: { shopName?: string; periodLabel: string; locale?: string; title?: string; labels?: AnalyticsPdfLabels }
): void {
  const locale = options.locale ?? 'pt-BR';
  const L = { ...DEFAULT_PDF_LABELS_PT, ...options.labels };
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const docAny = doc as any;
  let y = 20;
  const margin = 20;
  const primary = [212 / 255, 175 / 255, 55 / 255] as [number, number, number];

  // Title
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text(normalizeForPdf(options.title ?? L.title), margin, y);
  y += 10;

  if (options.shopName) {
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(normalizeForPdf(options.shopName), margin, y);
    y += 6;
  }

  doc.setFontSize(10);
  doc.text(normalizeForPdf(`${L.period}: ${options.periodLabel}`), margin, y);
  if (data.period.days > 0) {
    doc.text(
      normalizeForPdf(
        `${formatDateForPdf(data.period.since, locale)} – ${formatDateForPdf(data.period.until, locale)}`
      ),
      margin + 60,
      y
    );
  }
  y += 14;

  // Summary
  y = ensureSpace(doc, y);
  doc.setFontSize(14);
  doc.setTextColor(...primary);
  doc.text(normalizeForPdf(L.summary), margin, y);
  y += 8;

  const summaryRows = [
    [L.totalTickets, String(data.summary.total)],
    [L.completed, String(data.summary.completed)],
    [L.cancelled, String(data.summary.cancelled)],
    [L.waiting, String(data.summary.waiting ?? data.waiting ?? 0)],
    [L.inProgress, String(data.summary.inProgress ?? data.inProgress ?? 0)],
    [L.pending, String(data.summary.pending ?? data.pending ?? 0)],
    [L.completionRate, `${data.summary.completionRate}%`],
    [L.cancellationRate, `${data.summary.cancellationRate}%`],
    [L.avgPerDay, String(data.summary.avgPerDay)],
    [L.avgServiceTime, `${data.summary.avgServiceTime} min`],
    ...(data.summary.revenueCents != null && data.summary.revenueCents > 0
      ? [[L.revenue, `R$ ${(data.summary.revenueCents / 100).toLocaleString(locale, { minimumFractionDigits: 2 })}`]]
      : []),
  ].map((row) => [normalizeForPdf(row[0]), row[1]] as [string, string]);

  autoTable(doc, {
    startY: y,
    head: [[L.metric, L.value]].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string]),
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0] },
    margin: { left: margin, right: margin },
  });
  y = docAny.lastAutoTable.finalY + 10;

  y = ensureSpace(doc, y);
  doc.setFontSize(14);
  doc.setTextColor(...primary);
  doc.text(normalizeForPdf(L.comparisons), margin, y);
  y += 8;
  const weekOverWeek = data.trends?.weekOverWeek ?? 0;
  const topService = data.serviceBreakdown[0];
  const dayEntriesAll = Object.entries(data.dayOfWeekDistribution);
  const busiest = topEntries(dayEntriesAll, 1)[0];
  const quietest = bottomEntries(dayEntriesAll, 1)[0];
  const peak = data.peakHour;
  const compareRows: Array<[string, string]> = [
    ['WoW (volume)', `${weekOverWeek >= 0 ? '+' : ''}${weekOverWeek}%`],
    [L.peakHour, peak ? `${String(peak.hour).padStart(2, '0')}:00 (${peak.count})` : '-'],
    ['Top service', topService ? `${topService.serviceName} (${topService.count} | ${topService.percentage}%)` : '-'],
    ['Busiest weekday', busiest ? `${dayNameForPdf(String(busiest[0]), locale)} (${busiest[1]})` : '-'],
    ['Quietest weekday', quietest ? `${dayNameForPdf(String(quietest[0]), locale)} (${quietest[1]})` : '-'],
  ];
  autoTable(doc, {
    startY: y,
    head: [[L.metric, L.value]].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string]),
    body: compareRows.map((r) => [normalizeForPdf(r[0]), normalizeForPdf(r[1])]),
    theme: 'grid',
    headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
  });
  y = docAny.lastAutoTable.finalY + 12;

  if (data.typeBreakdown || data.appointmentMetrics || data.preferredBarberFulfillment) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.operationalMix), margin, y);
    y += 8;
    const type = data.typeBreakdown;
    const appt = data.appointmentMetrics;
    const pref = data.preferredBarberFulfillment;
    const mixRows: Array<[string, string]> = [
      [L.walkin, type ? `${type.walkin} (${type.walkinPercent}%)` : '-'],
      [L.appointment, type ? `${type.appointment} (${type.appointmentPercent}%)` : '-'],
      [L.noShowRate, appt ? `${appt.noShows}/${appt.total} (${appt.noShowRate}%)` : '-'],
      [L.avgMinutesLate, appt ? `${appt.avgMinutesLate}` : '-'],
      [L.onTimeCount, appt ? `${appt.onTimeCount}` : '-'],
      [L.preferredBarber, pref ? `${pref.fulfilled}/${pref.requested} (${pref.rate}%)` : '-'],
    ];
    autoTable(doc, {
      startY: y,
      head: [[L.metric, L.value]].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string]),
      body: mixRows.map((r) => [normalizeForPdf(r[0]), normalizeForPdf(r[1])]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 12;
  }

  if (data.clientMetrics || data.demographics) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.clients), margin, y);
    y += 8;
    const cm = data.clientMetrics;
    const clientRows: string[][] = cm
      ? [
          [normalizeForPdf('Unique'), String(cm.uniqueClients)],
          [normalizeForPdf('New'), String(cm.newClients)],
          [normalizeForPdf('Returning'), String(cm.returningClients)],
          [normalizeForPdf('Repeat rate'), `${cm.repeatRate}%`],
        ]
      : [];
    autoTable(doc, {
      startY: y,
      head: [[L.metric, L.value]].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string]),
      body: clientRows.length > 0 ? clientRows : [[normalizeForPdf('No client metrics in period'), '-']],
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 10;

    if (data.demographics) {
      const demo = data.demographics;
      y = ensureSpace(doc, y);
      doc.setFontSize(12);
      doc.setTextColor(...primary);
      doc.text(normalizeForPdf(L.demographics), margin, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [[normalizeForPdf('Top city'), normalizeForPdf('Gender split'), normalizeForPdf('Top style')]],
        body: [[
          normalizeForPdf(
            demo.locationBreakdown[0]
              ? `${demo.locationBreakdown[0].city}${demo.locationBreakdown[0].state ? `-${demo.locationBreakdown[0].state}` : ''} (${demo.locationBreakdown[0].count})`
              : '-'
          ),
          normalizeForPdf(
            demo.genderBreakdown
              .slice(0, 3)
              .map((g) => `${g.gender}: ${g.count}`)
              .join(' | ') || '-'
          ),
          normalizeForPdf(
            demo.styleBreakdown
              .slice(0, 3)
              .map((s) => `${s.style}: ${s.count}`)
              .join(' | ') || '-'
          ),
        ]],
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });
      y = docAny.lastAutoTable.finalY + 12;
    }
  }

  // Barbers
  if (data.barbers.length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.barbers), margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [[L.barber, L.served, L.avgMinutes, L.ratings, L.activityMinutes, L.avgWorkPerOpenDay]].map((row) =>
        row.map((c) => normalizeForPdf(c)) as [string, string, string, string, string, string]
      ),
      body: data.barbers.map((b: any) => [
        normalizeForPdf(b.name),
        String(b.totalServed),
        String(b.avgServiceTime),
        b.avgRating != null ? `${b.avgRating} (${b.ratingCount ?? 0})` : '-',
        b.totalActivityMinutes != null ? String(Math.round(b.totalActivityMinutes)) : '-',
        b.avgWorkTimeMinutesSinceMonthStart != null ? String(Math.round(b.avgWorkTimeMinutesSinceMonthStart)) : '-',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 12;
  }

  if (data.barberEfficiency.length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.barbersDetailed), margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [[L.barber, L.ticketsPerDay, L.completionRatePct, L.serviceSharePct]].map((row) =>
        row.map((c) => normalizeForPdf(c)) as [string, string, string, string]
      ),
      body: data.barberEfficiency.map((b) => {
        const served = data.barbers.find((x) => x.name === b.name)?.totalServed ?? 0;
        return [
          normalizeForPdf(b.name),
          String(b.ticketsPerDay),
          `${b.completionRate}%`,
          pct(served, data.summary.total),
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 12;
  }

  // Service breakdown
  if (data.serviceBreakdown.length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.services), margin, y);
    y += 8;

    const totalRevenue = data.summary.revenueCents ?? 0;
    autoTable(doc, {
      startY: y,
      head: [[L.service, L.quantity, L.serviceSharePct, L.revenue, L.revenueSharePct]].map((row) =>
        row.map((c) => normalizeForPdf(c)) as [string, string, string, string, string]
      ),
      body: data.serviceBreakdown.map((s: any) => {
        const rev = s.revenueCents ?? 0;
        return [
          normalizeForPdf(s.serviceName),
          String(s.count),
          `${s.percentage}%`,
          rev > 0 ? toMoney(rev, locale) : '-',
          rev > 0 ? pct(rev, totalRevenue) : '-',
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 12;
  }

  if (data.ticketsByDay && Object.keys(data.ticketsByDay).length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.dailyTimeline), margin, y);
    y += 8;
    const dayKeys = Object.keys(data.ticketsByDay).sort();
    autoTable(doc, {
      startY: y,
      head: [[L.date, L.tickets, L.waitAvgMin, L.revenue, L.walkin, L.appointment]].map((row) =>
        row.map((c) => normalizeForPdf(c)) as [string, string, string, string, string, string]
      ),
      body: dayKeys.map((k) => {
        const rev = data.revenueByDay?.[k] ?? 0;
        const split = data.typeByDay?.[k];
        return [
          formatDateForPdf(k, locale),
          String(data.ticketsByDay?.[k] ?? 0),
          String(data.waitTimeTrends?.[k] ?? '-'),
          rev > 0 ? toMoney(rev, locale) : '-',
          split ? String(split.walkin) : '-',
          split ? String(split.appointment) : '-',
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 12;
  }

  // Day of week
  const dayEntries = Object.entries(data.dayOfWeekDistribution).filter(([, n]) => n > 0);
  if (dayEntries.length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.attendancesByDayOfWeek), margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [[L.day, L.attendances]].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string]),
      body: dayEntries.map(([day, n]) => [normalizeForPdf(dayNameForPdf(day, locale)), String(n)]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 12;
  }

  if (data.hourlyDistribution && Object.keys(data.hourlyDistribution).length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.demandByHour), margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [[normalizeForPdf('Hour'), L.tickets, L.waitByHour, L.cancellationByHour]].map((row) =>
        row.map((c) => normalizeForPdf(c)) as [string, string, string, string]
      ),
      body: Array.from({ length: 24 }, (_, h) => {
        const hourKey = String(h);
        const cancelByHour = (data as any).cancellationAnalysis?.rateByHour?.[h] ?? 0;
        return [
          `${String(h).padStart(2, '0')}:00`,
          String(data.hourlyDistribution?.[h] ?? 0),
          String(data.waitTimeTrendsByHour?.[hourKey] ?? '-'),
          `${cancelByHour}%`,
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 12;
  }

  // Cancellation
  y = ensureSpace(doc, y);
  doc.setFontSize(14);
  doc.setTextColor(...primary);
  doc.text(normalizeForPdf(L.cancellations), margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(
    normalizeForPdf(
      `${L.avgTimeBeforeCancellation}: ${data.cancellationAnalysis.avgTimeBeforeCancellation} min`
    ),
    margin,
    y
  );
  y += 10;

  const cancellationByDayEntries = Object.entries(
    ((data as any).cancellationAnalysis?.rateByDay ?? {}) as Record<string, number>
  );
  if (cancellationByDayEntries.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [[L.day, L.cancellationRate]].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string]),
      body: cancellationByDayEntries
        .sort((a, b) => b[1] - a[1])
        .map(([day, v]) => [normalizeForPdf(dayNameForPdf(day, locale)), `${v}%`]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 12;
  }

  if (data.waitTimeTrendsByWeek && Object.keys(data.waitTimeTrendsByWeek).length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.weeklyWaitTrend), margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [[normalizeForPdf('Week start'), L.waitAvgMin]].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string]),
      body: Object.entries(data.waitTimeTrendsByWeek)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, String(v)]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 10;
  }

  if (data.waitTimeTrendsByMonth && Object.keys(data.waitTimeTrendsByMonth).length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.monthlyWaitTrend), margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [[normalizeForPdf('Month'), L.waitAvgMin]].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string]),
      body: Object.entries(data.waitTimeTrendsByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, String(v)]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 10;
  }

  if (data.waitTimeTrendsByYear && Object.keys(data.waitTimeTrendsByYear).length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.yearlyWaitTrend), margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [[normalizeForPdf('Year'), L.waitAvgMin]].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string]),
      body: Object.entries(data.waitTimeTrendsByYear)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, String(v)]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = docAny.lastAutoTable.finalY + 12;
  }

  // Barber efficiency (always include when data present; add page if needed)
  if (data.barberEfficiency.length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.efficiencyByBarber), margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [[L.barber, L.ticketsPerDay, L.completionRatePct]].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string, string]),
      body: data.barberEfficiency.map((b) => [
        normalizeForPdf(b.name),
        String(b.ticketsPerDay),
        String(b.completionRate),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
  }

  y = (docAny.lastAutoTable?.finalY ?? y) + 12;

  if ((data.trends?.last7DaysComparison?.length ?? 0) > 0 || (data.correlations?.ruleBased?.length ?? 0) > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf(L.insights), margin, y);
    y += 8;
    const movers = (data.trends?.last7DaysComparison ?? [])
      .slice()
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 7)
      .map((x) => `${x.day}: ${x.change >= 0 ? '+' : ''}${x.change}%`);
    const ruleBased = data.correlations?.ruleBased ?? [];
    const lines = [
      normalizeForPdf(`${L.topMovers7d}:`),
      ...movers.map((m) => normalizeForPdf(`- ${m}`)),
      ...(ruleBased.length > 0 ? [normalizeForPdf('')] : []),
      ...(ruleBased.length > 0 ? [normalizeForPdf('Cross-signals:')] : []),
      ...ruleBased.slice(0, 12).map((r) => normalizeForPdf(`- ${r}`)),
    ];
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    lines.forEach((line) => {
      y = ensureSpace(doc, y);
      doc.text(line, margin, y);
      y += 5;
    });
  }

  const sinceMonth = data.period.since.slice(0, 7);
  const untilMonth = data.period.until.slice(0, 7);
  const isSingleMonth = sinceMonth === untilMonth;
  const periodSlug =
    data.period.days === 0
      ? 'todo-periodo'
      : isSingleMonth
        ? sinceMonth
        : `${data.period.days}d`;
  const filename = `analytics-${periodSlug}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
