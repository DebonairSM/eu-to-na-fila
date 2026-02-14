import { useLocale } from '@/contexts/LocaleContext';
import { formatDate } from '@/lib/format';
import { formatDurationMinutes } from '@/lib/formatDuration';

interface WaitTimeTrendChartProps {
  data: Record<string, number>;
}

export function WaitTimeTrendChart({ data }: WaitTimeTrendChartProps) {
  const { locale, t } = useLocale();
  const days = Object.keys(data).sort();
  if (days.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-white/50">
        <p>{t('chart.noData')}</p>
      </div>
    );
  }

  const maxValue = Math.max(...Object.values(data), 1);
  const chartHeight = 200;
  const chartWidth = Math.max(days.length * 60, 400);

  const points = days.map((day, index) => {
    const value = data[day];
    const x = (index / (days.length - 1 || 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - 20 - (value / maxValue) * (chartHeight - 40);
    return { x, y, value, day };
  });

  const baselineY = chartHeight - 20;
  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  // Area under the curve: baseline (left→right), then line from last point back to first
  const areaPathData =
    points.length < 2
      ? ''
      : [
          `M ${points[0].x} ${baselineY}`,
          `L ${points[points.length - 1].x} ${baselineY}`,
          `L ${points[points.length - 1].x} ${points[points.length - 1].y}`,
          ...points
            .slice(0, -1)
            .reverse()
            .map((p) => `L ${p.x} ${p.y}`),
          `L ${points[0].x} ${points[0].y}`,
          'Z',
        ].join(' ');

  return (
    <div className="wait-time-trend-chart overflow-x-auto">
      <div style={{ minWidth: `${chartWidth}px` }} className="relative h-[220px]">
        <svg width={chartWidth} height={chartHeight} className="w-full">
          <defs>
            <linearGradient id="waitTimeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {areaPathData && (
            <path
              d={areaPathData}
              fill="url(#waitTimeGradient)"
              className="transition-opacity"
            />
          )}
          <path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all"
          />
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#3b82f6"
                className="transition-all hover:r-7 cursor-pointer"
              />
              <text
                x={point.x}
                y={point.y - 15}
                textAnchor="middle"
                className="text-xs font-semibold fill-[#3b82f6] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {point.value}m
              </text>
            </g>
          ))}
          {points.map((point, index) => (
            <text
              key={`label-${index}`}
              x={point.x}
              y={chartHeight - 5}
              textAnchor="middle"
              className="text-[0.65rem] fill-white/50"
            >
              {formatDate(new Date(point.day), locale, { day: '2-digit', month: '2-digit' })}
            </text>
          ))}
        </svg>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-white/70">
          {t('chart.averageWaitTime')}: <span className="text-[#3b82f6] font-semibold">
            {formatDurationMinutes(Math.round(Object.values(data).reduce((a, b) => a + b, 0) / days.length))}
          </span>
        </p>
      </div>
    </div>
  );
}

