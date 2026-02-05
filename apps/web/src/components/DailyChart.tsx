import { DAY_NAMES_PT, DAY_ORDER_API } from '@/lib/constants';

interface DailyChartProps {
  data: Record<string, number>;
}

export function DailyChart({ data }: DailyChartProps) {
  // Get last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const displayedValues = days.map((day) => data[day] ?? 0);
  const maxValue = Math.max(1, ...displayedValues);
  const barAreaHeight = 200; // Fixed height so bar proportions are consistent

  return (
    <div className="daily-chart flex items-end gap-2 sm:gap-3 py-5 overflow-x-auto" style={{ minHeight: barAreaHeight + 56 }}>
      {days.map((day) => {
        const value = data[day] || 0;
        const heightPx = maxValue > 0 ? (value / maxValue) * barAreaHeight : 0;
        const date = new Date(day);
        const dayName = DAY_NAMES_PT[DAY_ORDER_API[date.getDay()]] ?? date.toLocaleDateString('pt-BR', { weekday: 'short' });
        const dayNum = date.getDate();

        return (
          <div key={day} className="daily-bar flex-1 flex flex-col items-center min-w-[35px] sm:min-w-[40px] group">
            <div className="daily-bar-label mb-3 text-[0.7rem] sm:text-xs text-[rgba(255,255,255,0.7)] text-center flex-shrink-0">
              <div className="font-medium">{dayName}</div>
              <div className="text-[rgba(255,255,255,0.5)]">{dayNum}</div>
            </div>
            <div className="w-full flex items-end flex-shrink-0" style={{ height: barAreaHeight }}>
              <div
                className="daily-bar-fill w-full bg-gradient-to-t from-[#D4AF37] to-[#E8C547] rounded-t-lg transition-all cursor-pointer relative"
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
