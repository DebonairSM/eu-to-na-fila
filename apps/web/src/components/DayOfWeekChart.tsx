import { DAY_NAMES_PT } from '@/lib/constants';

interface DayOfWeekChartProps {
  data: Record<string, number>;
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function DayOfWeekChart({ data }: DayOfWeekChartProps) {
  const maxValue = Math.max(...Object.values(data), 1);
  const chartHeight = 200;
  const labelSpace = 50; // Reserved space for labels

  return (
    <div className="day-of-week-chart flex items-start gap-2 sm:gap-3 h-[200px] py-5 overflow-x-auto">
      {dayOrder.map((day) => {
        const value = data[day] || 0;
        const height = maxValue > 0 ? (value / maxValue) * (chartHeight - labelSpace) : 4;

        return (
          <div key={day} className="flex-1 flex flex-col items-center h-full min-w-[40px] sm:min-w-[50px] group">
            <div className="mb-3 text-[0.7rem] sm:text-xs text-[rgba(255,255,255,0.7)] text-center font-medium">
              {DAY_NAMES_PT[day] ?? day}
            </div>
            <div className="flex-1 flex items-end w-full">
              <div
                className="w-full bg-gradient-to-t from-[#D4AF37] to-[#E8C547] rounded-t-lg min-h-[4px] transition-all cursor-pointer relative"
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

