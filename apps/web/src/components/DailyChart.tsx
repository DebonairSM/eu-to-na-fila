import { useLocale } from '@/contexts/LocaleContext';
import { formatDayShortUtc } from '@/lib/format';

interface DailyChartProps {
  data: Record<string, number>;
  /** Start of the analytics period (YYYY-MM-DD). If set with until, chart shows days in this range. */
  since?: string;
  /** End of the analytics period (YYYY-MM-DD). If set with since, chart shows days in this range. */
  until?: string;
  /** Selected day key (YYYY-MM-DD) for highlight. */
  selectedDay?: string;
  onDaySelect?: (dayKey: string) => void;
}

function buildDaysInRange(since: string, until: string): string[] {
  const start = new Date(since + 'T00:00:00.000Z');
  const end = new Date(until + 'T00:00:00.000Z');
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(cursor.toISOString().split('T')[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Parse `YYYY-MM-DD` as a UTC calendar date (same semantics as analytics API day keys). */
function utcDateFromDayKey(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function DailyChart({ data, since, until, selectedDay, onDaySelect }: DailyChartProps) {
  const { locale } = useLocale();
  const days =
    since != null && until != null
      ? buildDaysInRange(since, until)
      : Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setUTCDate(date.getUTCDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

  const displayedValues = days.map((day) => data[day] ?? 0);
  const maxValue = Math.max(1, ...displayedValues);
  const barAreaHeight = 200;

  const minBarWidth = 28;
  const innerMinWidth = Math.max(days.length * (minBarWidth + 6), 320);

  return (
    <div className="daily-chart w-full overflow-x-auto pb-1">
      <div
        className="inline-flex items-end gap-1.5 sm:gap-2 py-5"
        style={{ minWidth: innerMinWidth, minHeight: barAreaHeight + 56 }}
      >
        {days.map((day) => {
          const value = data[day] || 0;
          const heightPx = maxValue > 0 ? (value / maxValue) * barAreaHeight : 0;
          const date = utcDateFromDayKey(day);
          const dayName = formatDayShortUtc(date, locale);
          const dayNum = date.getUTCDate();
          const isSelected = selectedDay != null && day === selectedDay;

          return (
            <div
              key={day}
              className="daily-bar flex flex-col items-center flex-shrink-0 w-[28px] sm:w-8 group"
            >
              <div className="daily-bar-label mb-3 text-[0.65rem] sm:text-xs text-[rgba(255,255,255,0.7)] text-center flex-shrink-0">
                <div className="font-medium">{dayName}</div>
                <div className="text-[rgba(255,255,255,0.5)]">{dayNum}</div>
              </div>
              <button
                type="button"
                onClick={() => onDaySelect?.(day)}
                className="w-full flex items-end flex-shrink-0 bg-transparent p-0 border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-accent)] rounded-t-lg"
                style={{ height: barAreaHeight }}
                aria-pressed={isSelected}
                aria-label={`${dayName} ${dayNum}, ${value}`}
              >
                <div
                  className={`daily-bar-fill w-full bg-gradient-to-t from-[#D4AF37] to-[#E8C547] rounded-t-lg transition-all relative ${
                    isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#242424]' : ''
                  }`}
                  style={{
                    height: `${heightPx}px`,
                    minHeight: value > 0 ? 4 : 0,
                    animation: 'growUp 0.8s ease-out',
                  }}
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs sm:text-sm font-semibold text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[rgba(10,10,10,0.9)] px-1.5 py-0.5 rounded pointer-events-none">
                    {value}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
