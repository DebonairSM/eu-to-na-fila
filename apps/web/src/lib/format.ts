/**
 * Locale-aware formatting helpers for currency, dates, and day names.
 */

export function formatCurrency(cents: number | undefined, locale: string): string {
  if (cents == null) return '';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function formatDate(
  date: Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, options ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatDayShort(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
}

/** Weekday for a UTC calendar date (matches API `YYYY-MM-DD` keys from `toISOString().slice(0, 10)`). */
export function formatDayShortUtc(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(date);
}

/** Day/month for a UTC calendar date key (same semantics as analytics `ticketsByDay` / `waitTimeTrends`). */
export function formatDayMonthUtc(dayKey: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(
    new Date(`${dayKey}T12:00:00.000Z`)
  );
}
