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

  const maxValue = Math.max(...Object.values(data), 1);
  const chartHeight = 250;
  const labelSpace = 50; // Reserved space for labels

  return (
    <div className="daily-chart flex items-start gap-2 sm:gap-3 h-[250px] py-5 overflow-x-auto">
      {days.map((day) => {
        const value = data[day] || 0;
        const height = maxValue > 0 ? (value / maxValue) * (chartHeight - labelSpace) : 4;
        const date = new Date(day);
        const dayName = DAY_NAMES_PT[DAY_ORDER_API[date.getDay()]] ?? date.toLocaleDateString('pt-BR', { weekday: 'short' });
        const dayNum = date.getDate();

        return (
          <div key={day} className="daily-bar flex-1 flex flex-col items-center h-full min-w-[35px] sm:min-w-[40px] group">
            <div className="daily-bar-label mb-3 text-[0.7rem] sm:text-xs text-[rgba(255,255,255,0.7)] text-center">
              <div className="font-medium">{dayName}</div>
              <div className="text-[rgba(255,255,255,0.5)]">{dayNum}</div>
            </div>
            <div className="flex-1 flex items-end w-full">
              <div
                className="daily-bar-fill w-full bg-gradient-to-t from-[#D4AF37] to-[#E8C547] rounded-t-lg min-h-[4px] transition-all cursor-pointer relative"
                style={{ 
                  height: `${height}px`,
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
