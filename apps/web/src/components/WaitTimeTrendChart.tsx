import { useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { formatDate } from '@/lib/format';
import { formatDurationMinutes } from '@/lib/formatDuration';

export type WaitTimeScope = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface WaitTimeTrendChartProps {
  data: Record<string, number>;
  dataByHour?: Record<string, number>;
  dataByWeek?: Record<string, number>;
  dataByMonth?: Record<string, number>;
  dataByYear?: Record<string, number>;
}

function useSortedKeys(
  scope: WaitTimeScope,
  data: Record<string, number>,
  dataByHour?: Record<string, number>,
  dataByWeek?: Record<string, number>,
  dataByMonth?: Record<string, number>,
  dataByYear?: Record<string, number>
): { keys: string[]; series: Record<string, number> } {
  if (scope === 'hourly' && dataByHour) {
    const keys = Array.from({ length: 24 }, (_, i) => String(i));
    const series: Record<string, number> = {};
    keys.forEach((h) => (series[h] = dataByHour[h] ?? 0));
    return { keys, series };
  }
  if (scope === 'weekly' && dataByWeek) {
    const keys = Object.keys(dataByWeek).sort();
    return { keys, series: dataByWeek };
  }
  if (scope === 'monthly' && dataByMonth) {
    const keys = Object.keys(dataByMonth).sort();
    return { keys, series: dataByMonth };
  }
  if (scope === 'yearly' && dataByYear) {
    const keys = Object.keys(dataByYear).sort();
    return { keys, series: dataByYear };
  }
  const keys = Object.keys(data).sort();
  return { keys, series: data };
}

function formatLabel(key: string, scope: WaitTimeScope, locale: string): string {
  if (scope === 'hourly') return `${key}h`;
  if (scope === 'daily') return formatDate(new Date(key + 'T12:00:00'), locale, { day: '2-digit', month: '2-digit' });
  if (scope === 'weekly') return formatDate(new Date(key + 'T12:00:00'), locale, { day: '2-digit', month: 'short' });
  if (scope === 'monthly') {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
  }
  if (scope === 'yearly') return key;
  return key;
}

export function WaitTimeTrendChart({
  data,
  dataByHour,
  dataByWeek,
  dataByMonth,
  dataByYear,
}: WaitTimeTrendChartProps) {
  const { locale, t } = useLocale();
  const [scope, setScope] = useState<WaitTimeScope>('daily');

  const { keys, series } = useSortedKeys(scope, data, dataByHour, dataByWeek, dataByMonth, dataByYear);

  if (keys.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {(['hourly', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className="px-3 py-1.5 rounded-lg text-sm border border-white/20 text-white/70 hover:bg-white/10"
            >
              {t(`chart.waitTimeScope${s.charAt(0).toUpperCase() + s.slice(1)}`)}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center h-[250px] text-white/50">
          <p>{t('chart.noData')}</p>
        </div>
      </div>
    );
  }

  const values = keys.map((k) => series[k] ?? 0);
  const maxValue = Math.max(...values, 1);
  const chartHeight = 200;
  const chartWidth = Math.max(keys.length * 48, 400);

  const points = keys.map((key, index) => {
    const value = series[key] ?? 0;
    const x = (index / (keys.length - 1 || 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - 20 - (value / maxValue) * (chartHeight - 40);
    return { x, y, value, key };
  });

  const baselineY = chartHeight - 20;
  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

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

  const avg =
    values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

  return (
    <div className="wait-time-trend-chart flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {(['hourly', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              scope === s
                ? 'border-[#3b82f6] bg-[#3b82f6]/20 text-[#3b82f6]'
                : 'border-white/20 text-white/70 hover:bg-white/10'
            }`}
          >
            {t(`chart.waitTimeScope${s.charAt(0).toUpperCase() + s.slice(1)}`)}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${chartWidth}px` }} className="relative h-[220px]">
          <svg width={chartWidth} height={chartHeight} className="w-full">
            <defs>
              <linearGradient id="waitTimeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            {areaPathData && (
              <path d={areaPathData} fill="url(#waitTimeGradient)" className="transition-opacity" />
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
                {formatLabel(point.key, scope, locale)}
              </text>
            ))}
          </svg>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm text-white/70">
          {t('chart.averageWaitTime')}:{' '}
          <span className="text-[#3b82f6] font-semibold">{formatDurationMinutes(avg)}</span>
        </p>
      </div>
    </div>
  );
}
