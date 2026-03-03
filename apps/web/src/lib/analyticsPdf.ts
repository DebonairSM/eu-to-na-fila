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
}

export function downloadAnalyticsPdf(
  data: AnalyticsDataForPdf,
  options: { shopName?: string; periodLabel: string; locale?: string; title?: string }
): void {
  const locale = options.locale ?? 'pt-BR';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 20;
  const margin = 20;
  const primary = [212 / 255, 175 / 255, 55 / 255] as [number, number, number];

  // Title
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text(normalizeForPdf(options.title ?? 'Relatório de desempenho'), margin, y);
  y += 10;

  if (options.shopName) {
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(normalizeForPdf(options.shopName), margin, y);
    y += 6;
  }

  doc.setFontSize(10);
  doc.text(normalizeForPdf(`Período: ${options.periodLabel}`), margin, y);
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
  doc.text(normalizeForPdf('Resumo'), margin, y);
  y += 8;

  const summaryRows = [
    ['Total de tickets', String(data.summary.total)],
    ['Concluídos', String(data.summary.completed)],
    ['Cancelados', String(data.summary.cancelled)],
    ['Taxa de conclusão', `${data.summary.completionRate}%`],
    ['Taxa de cancelamento', `${data.summary.cancellationRate}%`],
    ['Média por dia', String(data.summary.avgPerDay)],
    ['Tempo médio de serviço', `${data.summary.avgServiceTime} min`],
    ...(data.summary.revenueCents != null && data.summary.revenueCents > 0
      ? [['Receita', `R$ ${(data.summary.revenueCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]]
      : []),
  ].map((row) => [normalizeForPdf(row[0]), row[1]] as [string, string]);

  autoTable(doc, {
    startY: y,
    head: [['Métrica', 'Valor']].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string]),
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0] },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // Barbers
  if (data.barbers.length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf('Barbeiros'), margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Barbeiro', 'Atendidos', 'Tempo médio (min)']].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string, string]),
      body: data.barbers.map((b) => [
        normalizeForPdf(b.name),
        String(b.totalServed),
        String(b.avgServiceTime),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Service breakdown
  if (data.serviceBreakdown.length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf('Serviços'), margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Serviço', 'Quantidade', '%']].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string, string]),
      body: data.serviceBreakdown.map((s) => [
        normalizeForPdf(s.serviceName),
        String(s.count),
        `${s.percentage}%`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Day of week
  const dayEntries = Object.entries(data.dayOfWeekDistribution).filter(([, n]) => n > 0);
  if (dayEntries.length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf('Atendimentos por dia da semana'), margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Dia', 'Atendimentos']].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string]),
      body: dayEntries.map(([day, n]) => [normalizeForPdf(dayNameForPdf(day, locale)), String(n)]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Cancellation
  y = ensureSpace(doc, y);
  doc.setFontSize(14);
  doc.setTextColor(...primary);
  doc.text(normalizeForPdf('Cancelamentos'), margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(
    normalizeForPdf(
      `Tempo médio até cancelamento: ${data.cancellationAnalysis.avgTimeBeforeCancellation} min`
    ),
    margin,
    y
  );
  y += 10;

  // Barber efficiency (always include when data present; add page if needed)
  if (data.barberEfficiency.length > 0) {
    y = ensureSpace(doc, y);
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(normalizeForPdf('Eficiência por barbeiro'), margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Barbeiro', 'Tickets/dia', 'Taxa conclusão %']].map((row) => row.map((c) => normalizeForPdf(c)) as [string, string, string]),
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
