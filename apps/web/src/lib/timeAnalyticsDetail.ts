/** Detail scope for time-tab secondary charts (hourly, weekly pattern, wait time). */
export type TimeDetailFrame = 'day' | 'week' | 'month';

export function dayKeyFromIso(iso: string): string {
  return iso.split('T')[0];
}

function utcDay(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

/** YYYY-MM-DD from UTC calendar parts. */
export function formatDayKeyUtc(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Monday–Sunday week containing `dayKey`, clipped to [monthSince, monthUntil] (inclusive, YYYY-MM-DD).
 */
export function getWeekRangeClippedToMonth(
  dayKey: string,
  monthSince: string,
  monthUntil: string
): { since: string; until: string } | null {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = utcDay(y ?? 2000, m ?? 1, d ?? 1);
  const dow = date.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const ms = new Date(monthSince + 'T00:00:00.000Z').getTime();
  const mu = new Date(monthUntil + 'T23:59:59.999Z').getTime();
  const ws = monday.getTime();
  const we = sunday.getTime();
  const start = new Date(Math.max(ws, ms));
  const end = new Date(Math.min(we, mu));
  if (start > end) return null;
  return { since: formatDayKeyUtc(start), until: formatDayKeyUtc(end) };
}

export function getDetailApiRange(
  frame: TimeDetailFrame,
  selectedDay: string,
  monthSince: string,
  monthUntil: string
): { since: string; until: string } | null {
  if (frame === 'month') return { since: monthSince, until: monthUntil };
  if (frame === 'day') return { since: selectedDay, until: selectedDay };
  return getWeekRangeClippedToMonth(selectedDay, monthSince, monthUntil);
}

const DOW_TO_UTCDAY: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 0,
};

const UTC_DOW_TO_ENGLISH = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Weekday name for a UTC YYYY-MM-DD key (matches daily chart day keys). */
export function englishWeekdayFromUtcDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1, d ?? 1));
  return UTC_DOW_TO_ENGLISH[date.getUTCDay()];
}

/** Last calendar date in [since, until] that falls on `englishDayName`, or null. */
export function lastDateOfWeekdayInRange(since: string, until: string, englishDayName: string): string | null {
  if (!(englishDayName in DOW_TO_UTCDAY)) return null;
  const target = DOW_TO_UTCDAY[englishDayName as keyof typeof DOW_TO_UTCDAY];
  const end = new Date(until + 'T00:00:00.000Z');
  const start = new Date(since + 'T00:00:00.000Z');
  let cur = new Date(end);
  while (cur >= start) {
    if (cur.getUTCDay() === target) {
      return formatDayKeyUtc(cur);
    }
    cur.setUTCDate(cur.getUTCDate() - 1);
  }
  return null;
}
