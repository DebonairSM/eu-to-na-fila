import { DAY_NAMES_PT } from '@/lib/constants';

interface DayOfWeekChartProps {
  data: Record<string, number>;
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function DayOfWeekChart({ data }: DayOfWeekChartProps) {
  const maxValue = Math.max(1, ...dayOrder.map((day) => data[day] ?? 0));
  const barAreaHeight = 200;

  return (
    <div className="day-of-week-chart flex items-end gap-2 sm:gap-3 py-5 overflow-x-auto" style={{ minHeight: barAreaHeight + 56 }}>
      {dayOrder.map((day) => {
        const value = data[day] || 0;
        const heightPx = maxValue > 0 ? (value / maxValue) * barAreaHeight : 0;

        return (
          <div key={day} className="flex-1 flex flex-col items-center min-w-[40px] sm:min-w-[50px] group">
            <div className="mb-3 text-[0.7rem] sm:text-xs text-[rgba(255,255,255,0.7)] text-center font-medium flex-shrink-0">
              {DAY_NAMES_PT[day] ?? day}
            </div>
            <div className="w-full flex items-end flex-shrink-0" style={{ height: barAreaHeight }}>
              <div
                className="w-full bg-gradient-to-t from-[#D4AF37] to-[#E8C547] rounded-t-lg transition-all cursor-pointer relative"
                style={{
                  height: `${heightPx}px`,
                  minHeight: value > 0 ? 4 : 0,
                  animation: 'growUp 0.8s ease-out',
                }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs sm:text-sm font-semibold text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[rgba(10,10,10,0.9)] px-1.5 py-0.5 rounded">
                  {value}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

