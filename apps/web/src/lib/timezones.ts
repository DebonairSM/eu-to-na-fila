/**
 * IANA timezone list for dropdowns. Uses Intl.supportedValuesOf when available,
 * otherwise a curated list (Brazil, Americas, UTC).
 */
const CURATED_TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Fortaleza',
  'America/Recife',
  'America/Belem',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Buenos_Aires',
  'America/Santiago',
  'America/Bogota',
  'America/Lima',
  'America/Caracas',
  'America/Mexico_City',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Montevideo',
  'America/Asuncion',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Paris',
  'UTC',
];

function getTimeZoneList(): string[] {
  if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
    try {
      const list = (Intl as any).supportedValuesOf('timeZone') as string[];
      if (Array.isArray(list) && list.length > 0) {
        const set = new Set(list);
        const curatedFirst = CURATED_TIMEZONES.filter((z) => set.has(z));
        const rest = list.filter((z) => !CURATED_TIMEZONES.includes(z)).sort();
        return [...curatedFirst, ...rest];
      }
    } catch {
      // ignore
    }
  }
  return [...CURATED_TIMEZONES];
}

let cachedList: string[] | null = null;

export function getTimezoneOptions(): string[] {
  if (cachedList === null) {
    cachedList = getTimeZoneList();
  }
  return cachedList;
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Sao_Paulo';
  }
}

/**
 * Format a date/time for display to the client, using the client's detected timezone (browser/device).
 * Use this for any customer-facing date/time so they always see their local time.
 */
export function formatInClientTimezone(
  date: Date | string,
  locale: string = 'pt-BR',
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const tz = getBrowserTimezone();
  return d.toLocaleString(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: tz,
    ...options,
  });
}
