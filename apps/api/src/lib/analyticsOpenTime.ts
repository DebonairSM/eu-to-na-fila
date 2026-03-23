import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { OperatingHours } from '@eutonafila/shared';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function parseMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function weekdayKeyFromYmdInTz(dayStr: string, timezone: string): (typeof DAY_KEYS)[number] {
  const [y, m, d] = dayStr.split('-').map(Number);
  if (!y || !m || !d) return 'monday';
  const utc = fromZonedTime(new Date(y, m - 1, d, 12, 0, 0), timezone);
  return DAY_KEYS[toZonedTime(utc, timezone).getDay()];
}

function nextCalendarDayInTz(dayStr: string, timezone: string): string {
  const [y, m, d] = dayStr.split('-').map(Number);
  if (!y || !m || !d) return dayStr;
  const utc = fromZonedTime(new Date(y, m - 1, d, 12, 0, 0), timezone);
  return formatInTimeZone(addDays(utc, 1), timezone, 'yyyy-MM-dd');
}

/**
 * Calendar days (inclusive) overlapping [sinceUtc, untilUtc) when formatted in `timezone`.
 */
export function countCalendarDaysInUtcRange(timezone: string, sinceUtc: Date, untilUtc: Date): number {
  const startStr = formatInTimeZone(sinceUtc, timezone, 'yyyy-MM-dd');
  const endStr = formatInTimeZone(new Date(untilUtc.getTime() - 1), timezone, 'yyyy-MM-dd');
  let n = 0;
  let cur = startStr;
  let guard = 0;
  while (cur <= endStr && guard++ < 4000) {
    n++;
    if (cur >= endStr) break;
    cur = nextCalendarDayInTz(cur, timezone);
  }
  return Math.max(1, n);
}

/**
 * Days the shop has operating hours in [sinceUtc, untilUtc). When `operatingHours` is unset, counts calendar days in shop TZ (same as always-open).
 */
export function countOpenDaysInUtcRange(
  operatingHours: OperatingHours | undefined,
  timezone: string,
  sinceUtc: Date,
  untilUtc: Date
): number {
  if (!operatingHours) {
    return countCalendarDaysInUtcRange(timezone, sinceUtc, untilUtc);
  }
  const startStr = formatInTimeZone(sinceUtc, timezone, 'yyyy-MM-dd');
  const endStr = formatInTimeZone(new Date(untilUtc.getTime() - 1), timezone, 'yyyy-MM-dd');
  let count = 0;
  let cur = startStr;
  let guard = 0;
  while (cur <= endStr && guard++ < 4000) {
    const key = weekdayKeyFromYmdInTz(cur, timezone);
    const day = operatingHours[key];
    if (day && typeof day === 'object') count++;
    if (cur >= endStr) break;
    cur = nextCalendarDayInTz(cur, timezone);
  }
  return Math.max(1, count);
}

/**
 * True if local wall time (from `toZonedTime(utc, timezone)`) falls inside open–close, excluding lunch.
 * When no operating hours, treated as always open.
 */
export function isWithinShopOpenHours(
  operatingHours: OperatingHours | undefined,
  localInShop: Date
): boolean {
  if (!operatingHours) return true;
  const key = DAY_KEYS[localInShop.getDay()];
  const h = operatingHours[key];
  if (!h || typeof h !== 'object') return false;
  const t = localInShop.getHours() * 60 + localInShop.getMinutes();
  const open = parseMinutes(h.open ?? '09:00');
  const close = parseMinutes(h.close ?? '18:00');
  if (t < open || t >= close) return false;
  if (h.lunchStart && h.lunchEnd) {
    const ls = parseMinutes(h.lunchStart);
    const le = parseMinutes(h.lunchEnd);
    if (t >= ls && t < le) return false;
  }
  return true;
}
