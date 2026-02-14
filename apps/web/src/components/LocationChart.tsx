import { useLocale } from '@/contexts/LocaleContext';

interface LocationChartProps {
  data: Array<{ city: string; state?: string; count: number }>;
}

const colors = [
  '#D4AF37',
  '#E8C547',
  '#3b82f6',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#10b981',
  '#6366f1',
];

export function LocationChart({ data }: LocationChartProps) {
  const { t } = useLocale();
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-white/50">
        <p>{t('common.noDataAvailable')}</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const label = item.state ? `${item.city} (${item.state})` : item.city;
        const pct = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
        const color = colors[index % colors.length];
        return (
          <div key={`${item.city}-${item.state ?? ''}`} className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-white font-medium truncate">{label}</span>
                <span className="text-[#D4AF37] font-semibold text-sm shrink-0">{item.count}</span>
              </div>
              <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
