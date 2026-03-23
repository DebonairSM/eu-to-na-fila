import { useLocale } from '@/contexts/LocaleContext';

interface DayOfWeekChartProps {
  data: Record<string, number>;
  /** English weekday name (Monday … Sunday); highlights that bar when set. */
  highlightDay?: string;
  onDayClick?: (englishDayName: string) => void;
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function DayOfWeekChart({ data, highlightDay, onDayClick }: DayOfWeekChartProps) {
  const { t } = useLocale();
  const maxValue = Math.max(1, ...dayOrder.map((day) => data[day] ?? 0));
  const barAreaHeight = 200;

  return (
    <div className="day-of-week-chart flex items-end gap-2 sm:gap-3 py-5 overflow-x-auto" style={{ minHeight: barAreaHeight + 56 }}>
      {dayOrder.map((day) => {
        const value = data[day] || 0;
        const heightPx = maxValue > 0 ? (value / maxValue) * barAreaHeight : 0;
        const isHighlight = highlightDay === day;

        return (
          <div key={day} className="flex-1 flex flex-col items-center min-w-[40px] sm:min-w-[50px] group">
            <div className="mb-3 text-[0.7rem] sm:text-xs text-[rgba(255,255,255,0.7)] text-center font-medium flex-shrink-0">
              {t(`common.dayShort.${day}`) || day}
            </div>
            <div className="w-full flex items-end flex-shrink-0" style={{ height: barAreaHeight }}>
              <button
                type="button"
                disabled={!onDayClick}
                onClick={() => onDayClick?.(day)}
                className={`w-full bg-transparent border-0 p-0 flex items-end justify-center rounded-t-lg transition-all cursor-pointer disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-accent)] ${
                  onDayClick ? 'cursor-pointer' : ''
                }`}
                style={{ height: barAreaHeight }}
                aria-pressed={isHighlight}
                aria-label={t(`common.dayShort.${day}`)}
              >
                <div
                  className={`w-full bg-gradient-to-t from-[#D4AF37] to-[#E8C547] rounded-t-lg transition-all relative ${
                    isHighlight ? 'ring-2 ring-white ring-offset-2 ring-offset-[#242424]' : ''
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
          </div>
        );
      })}
    </div>
  );
}

