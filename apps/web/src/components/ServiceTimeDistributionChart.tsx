interface ServiceTimeDistributionChartProps {
  data: Record<string, number>;
}

const ranges = ['0-10', '10-20', '20-30', '30-45', '45-60', '60+'];
const rangeLabels: Record<string, string> = {
  '0-10': '0-10 min',
  '10-20': '10-20 min',
  '20-30': '20-30 min',
  '30-45': '30-45 min',
  '45-60': '45-60 min',
  '60+': '60+ min',
};

export function ServiceTimeDistributionChart({ data }: ServiceTimeDistributionChartProps) {
  const maxValue = Math.max(...Object.values(data), 1);
  const chartHeight = 200;
  const labelSpace = 50; // Reserved space for labels

  return (
    <div className="service-time-distribution-chart flex items-start gap-2 sm:gap-3 h-[200px] py-5">
      {ranges.map((range) => {
        const value = data[range] || 0;
        const height = maxValue > 0 ? (value / maxValue) * (chartHeight - labelSpace) : 4;

        return (
          <div key={range} className="flex-1 flex flex-col items-center h-full min-w-[50px] group">
            <div className="mb-3 text-[0.7rem] sm:text-xs text-[rgba(255,255,255,0.7)] text-center font-medium">
              {rangeLabels[range]}
            </div>
            <div className="flex-1 flex items-end w-full">
              <div
                className="w-full bg-gradient-to-t from-[#22c55e] to-[#4ade80] rounded-t-lg min-h-[4px] transition-all cursor-pointer relative"
                style={{
                  height: `${height}px`,
                  animation: 'growUp 0.8s ease-out',
                }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs sm:text-sm font-semibold text-[#22c55e] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[rgba(10,10,10,0.9)] px-1.5 py-0.5 rounded">
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

