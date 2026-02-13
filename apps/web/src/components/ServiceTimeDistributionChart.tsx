interface ServiceTimeDistributionChartProps {
  data: Record<string, number>;
}

const ranges = ['0-10', '10-20', '20-30', '30-45', '45-60', '60+'];
const rangeLabels: Record<string, string> = {
  '0-10': '0-10m',
  '10-20': '10-20m',
  '20-30': '20-30m',
  '30-45': '30-45m',
  '45-60': '45m-1h',
  '60+': '1h+',
};

export function ServiceTimeDistributionChart({ data }: ServiceTimeDistributionChartProps) {
  const maxValue = Math.max(1, ...ranges.map((r) => data[r] ?? 0));
  const barAreaHeight = 200;

  return (
    <div className="service-time-distribution-chart flex items-end gap-2 sm:gap-3 py-5" style={{ minHeight: barAreaHeight + 56 }}>
      {ranges.map((range) => {
        const value = data[range] || 0;
        const heightPx = maxValue > 0 ? (value / maxValue) * barAreaHeight : 0;

        return (
          <div key={range} className="flex-1 flex flex-col items-center min-w-[50px] group">
            <div className="mb-3 text-[0.7rem] sm:text-xs text-[rgba(255,255,255,0.7)] text-center font-medium flex-shrink-0">
              {rangeLabels[range]}
            </div>
            <div className="w-full flex items-end flex-shrink-0" style={{ height: barAreaHeight }}>
              <div
                className="w-full bg-white rounded-t-lg transition-all cursor-pointer relative"
                style={{
                  height: `${heightPx}px`,
                  minHeight: value > 0 ? 4 : 0,
                  animation: 'growUp 0.8s ease-out',
                }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs sm:text-sm font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[rgba(10,10,10,0.9)] px-1.5 py-0.5 rounded">
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

