interface HourlyChartProps {
  data: Record<number, number>;
  peakHour: { hour: number; count: number } | null;
}

export function HourlyChart({ data, peakHour }: HourlyChartProps) {
  // Get all 24 hours
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxValue = Math.max(1, ...hours.map((h) => data[h] ?? 0));
  const barAreaHeight = 165;

  return (
    <div className="hourly-chart grid grid-cols-12 sm:grid-cols-24 gap-1 sm:gap-2 py-5 overflow-x-auto" style={{ minHeight: barAreaHeight + 40 }}>
      {hours.map((hour) => {
        const value = data[hour] || 0;
        const heightPx = maxValue > 0 ? (value / maxValue) * barAreaHeight : 0;
        const isPeak = peakHour?.hour === hour;

        return (
          <div key={hour} className="hourly-bar flex flex-col items-center relative min-w-[25px] sm:min-w-[30px] group">
            <div className="hourly-bar-label mb-2 text-[0.6rem] sm:text-[0.65rem] text-[rgba(255,255,255,0.5)] text-center font-medium flex-shrink-0">
              {hour}h
            </div>
            <div className="w-full flex items-end flex-shrink-0" style={{ height: barAreaHeight }}>
              <div
                className={`hourly-bar-fill w-full bg-gradient-to-t from-[#3b82f6] to-[#60a5fa] rounded-t transition-all cursor-pointer relative ${
                  isPeak ? 'ring-2 ring-[#D4AF37] ring-offset-1 sm:ring-offset-2 ring-offset-[#242424]' : ''
                }`}
                style={{
                  height: `${heightPx}px`,
                  minHeight: value > 0 ? 4 : 0,
                  animation: 'growUp 0.8s ease-out',
                }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[0.65rem] sm:text-xs font-bold text-[#3b82f6] bg-[rgba(10,10,10,0.9)] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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
