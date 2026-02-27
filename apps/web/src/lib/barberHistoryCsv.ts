import type { BarberServiceHistoryTicket } from '@/lib/api/analytics';

const PAGE_LIMIT = 100;

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatIsoDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface BarberHistoryCsvLabels {
  date: string;
  service: string;
  status: string;
  duration: string;
}

export interface BarberHistoryCsvOptions {
  since?: string;
  until?: string;
}

export type GetBarberServiceHistoryFn = (
  shopSlug: string,
  barberId: number,
  params?: { since?: string; until?: string; page?: number; limit?: number }
) => Promise<{ tickets: BarberServiceHistoryTicket[]; total: number }>;

/**
 * Fetches all barber service history pages and triggers a CSV download.
 */
export async function downloadBarberServiceHistoryCsv(
  getHistory: GetBarberServiceHistoryFn,
  shopSlug: string,
  barberId: number,
  barberName: string,
  labels: BarberHistoryCsvLabels,
  options?: BarberHistoryCsvOptions
): Promise<void> {
  const allTickets: BarberServiceHistoryTicket[] = [];
  let page = 1;
  let total = 0;

  do {
    const res = await getHistory(shopSlug, barberId, {
      since: options?.since,
      until: options?.until,
      page,
      limit: PAGE_LIMIT,
    });
    allTickets.push(...res.tickets);
    total = res.total;
    if (res.tickets.length < PAGE_LIMIT) break;
    page += 1;
  } while (allTickets.length < total);

  const header = [labels.date, labels.service, labels.status, labels.duration]
    .map(escapeCsvCell)
    .join(',');

  const rows = allTickets.map((t) => {
    const date = formatIsoDateTime(t.createdAt);
    const service = escapeCsvCell(t.serviceName);
    const status = escapeCsvCell(t.status);
    const duration = t.durationMinutes != null ? String(t.durationMinutes) : '—';
    return [date, service, status, duration].map(escapeCsvCell).join(',');
  });

  const csv = [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = barberName.replace(/[^\p{L}\p{N}\s_-]/gu, '').trim() || 'barber';
  const range = options?.since && options?.until ? `${options.since}_${options.until}` : 'full';
  a.download = `barber-service-history_${safeName}_${range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
