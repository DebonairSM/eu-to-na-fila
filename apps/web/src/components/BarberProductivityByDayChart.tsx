export interface BarberProductivityByDayRow {
  barberId: number;
  barberName: string;
  dayOfWeek: number;
  dayName: string;
  avgDurationMinutes: number;
  totalCompleted: number;
}

interface BarberProductivityByDayChartProps {
  allTime: BarberProductivityByDayRow[];
  inPeriod?: BarberProductivityByDayRow[];
  scope: 'all_time' | 'period';
  onScopeChange: (scope: 'all_time' | 'period') => void;
  dayLabels: Record<string, string>;
  labelAvgMinutes: string;
  labelAttendances: string;
  labelAllTime: string;
  labelThisPeriod: string;
}

const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6]; // Sunday .. Saturday

function buildBarberDayMap(rows: BarberProductivityByDayRow[]): Map<number, Map<number, BarberProductivityByDayRow>> {
  const byBarber = new Map<number, Map<number, BarberProductivityByDayRow>>();
  for (const row of rows) {
    let barberMap = byBarber.get(row.barberId);
    if (!barberMap) {
      barberMap = new Map();
      byBarber.set(row.barberId, barberMap);
    }
    barberMap.set(row.dayOfWeek, row);
  }
  return byBarber;
}

function getBarbers(rows: BarberProductivityByDayRow[]): { barberId: number; barberName: string }[] {
  const seen = new Map<number, string>();
  for (const row of rows) {
    if (!seen.has(row.barberId)) seen.set(row.barberId, row.barberName);
  }
  return Array.from(seen.entries()).map(([barberId, barberName]) => ({ barberId, barberName }));
}

export function BarberProductivityByDayChart({
  allTime,
  inPeriod,
  scope,
  onScopeChange,
  dayLabels,
  labelAvgMinutes,
  labelAttendances,
  labelAllTime,
  labelThisPeriod,
}: BarberProductivityByDayChartProps) {
  const data = scope === 'period' && inPeriod && inPeriod.length > 0 ? inPeriod : allTime;
  const byBarber = buildBarberDayMap(data);
  const barbers = getBarbers(data);
  const barAreaHeight = 180;

  if (barbers.length === 0) {
    return (
      <p className="text-sm text-white/60 py-4">
        No productivity data by day yet.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {inPeriod && inPeriod.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-white/70">Data:</span>
          <button
            type="button"
            onClick={() => onScopeChange('all_time')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              scope === 'all_time'
                ? 'bg-[var(--shop-accent)] text-black'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            {labelAllTime}
          </button>
          <button
            type="button"
            onClick={() => onScopeChange('period')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              scope === 'period'
                ? 'bg-[var(--shop-accent)] text-black'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            {labelThisPeriod}
          </button>
        </div>
      )}

      {barbers.map(({ barberId, barberName }) => {
        const dayMap = byBarber.get(barberId);
        const values = DAY_ORDER.map((d) => dayMap?.get(d));
        const maxMinutes = Math.max(
          1,
          ...values.map((v) => (v ? v.avgDurationMinutes : 0))
        );

        return (
          <div
            key={barberId}
            className="bg-[rgba(36,36,36,0.6)] border border-[var(--shop-border-color)] rounded-2xl p-6"
          >
            <h4 className="text-lg text-white mb-4 font-medium">{barberName}</h4>
            <div
              className="flex items-end gap-2 sm:gap-3 overflow-x-auto py-2"
              style={{ minHeight: barAreaHeight + 52 }}
            >
              {DAY_ORDER.map((dayOfWeek) => {
                const row = dayMap?.get(dayOfWeek);
                const dayName = row?.dayName ?? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
                const label = dayLabels[dayName] ?? dayName;
                const avgMin = row?.avgDurationMinutes ?? 0;
                const count = row?.totalCompleted ?? 0;
                const heightPx = maxMinutes > 0 ? (avgMin / maxMinutes) * barAreaHeight : 0;

                return (
                  <div
                    key={dayOfWeek}
                    className="flex-1 flex flex-col items-center min-w-[44px] sm:min-w-[52px] group"
                  >
                    <div className="mb-2 text-[0.7rem] sm:text-xs text-white/70 text-center font-medium flex-shrink-0">
                      {label}
                    </div>
                    <div
                      className="w-full flex items-end flex-shrink-0 rounded-t"
                      style={{ height: barAreaHeight }}
                    >
                      <div
                        className="w-full bg-gradient-to-t from-[var(--shop-accent)] to-[var(--shop-accent-hover)] rounded-t transition-all cursor-pointer relative"
                        style={{
                          height: `${heightPx}px`,
                          minHeight: avgMin > 0 ? 4 : 0,
                          animation: 'growUp 0.5s ease-out',
                        }}
                      >
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[rgba(10,10,10,0.95)] px-2 py-1.5 rounded border border-white/10 z-10 shadow-lg">
                          <div>{labelAvgMinutes}: {avgMin}</div>
                          <div className="text-white/80">{labelAttendances}: {count}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
