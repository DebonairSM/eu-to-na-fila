export interface BarberProductivityByDayRow {
  barberId: number;
  barberName: string;
  dayOfWeek: number;
  dayName: string;
  avgDurationMinutes: number;
  totalCompleted: number;
}

export type ProductivityTimeScope = 'all_time' | 'period' | 'week';

interface BarberProductivityByDayChartProps {
  allTime: BarberProductivityByDayRow[];
  inPeriod?: BarberProductivityByDayRow[];
  weekData?: BarberProductivityByDayRow[] | null;
  weekLabel?: string;
  timeScope: ProductivityTimeScope;
  onTimeScopeChange: (scope: ProductivityTimeScope) => void;
  weekOptions?: { value: string; label: string }[];
  selectedWeekStart: string | null;
  onWeekSelect: (weekStart: string | null) => void;
  barbers: Array<{ id: number; name: string }>;
  selectedBarberId: number | null;
  onBarberChange: (barberId: number | null) => void;
  dayLabels: Record<string, string>;
  labelAvgMinutes: string;
  labelAttendances: string;
  labelAllTime: string;
  labelThisPeriod: string;
  labelWeek: string;
  labelWeekPrev: string;
  labelWeekNext: string;
  labelAllBarbers: string;
  labelBarber: string;
}

const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

function aggregateToAverage(rows: BarberProductivityByDayRow[], averageName: string): BarberProductivityByDayRow[] {
  const byDay = new Map<number, { totalCompleted: number; weightedDuration: number }>();
  for (const row of rows) {
    const cur = byDay.get(row.dayOfWeek);
    const w = row.totalCompleted * row.avgDurationMinutes;
    if (cur) {
      cur.totalCompleted += row.totalCompleted;
      cur.weightedDuration += w;
    } else {
      byDay.set(row.dayOfWeek, { totalCompleted: row.totalCompleted, weightedDuration: w });
    }
  }
  return Array.from(byDay.entries()).map(([dayOfWeek, agg]) => ({
    barberId: 0,
    barberName: averageName,
    dayOfWeek,
    dayName: DAY_NAMES[dayOfWeek],
    avgDurationMinutes:
      agg.totalCompleted > 0 ? Math.round((agg.weightedDuration / agg.totalCompleted) * 10) / 10 : 0,
    totalCompleted: agg.totalCompleted,
  }));
}

function filterByBarber(rows: BarberProductivityByDayRow[], barberId: number): BarberProductivityByDayRow[] {
  return rows.filter((r) => r.barberId === barberId);
}

export function BarberProductivityByDayChart({
  allTime,
  inPeriod,
  weekData,
  weekLabel,
  timeScope,
  onTimeScopeChange,
  weekOptions,
  selectedWeekStart,
  onWeekSelect,
  barbers,
  selectedBarberId,
  onBarberChange,
  dayLabels,
  labelAvgMinutes,
  labelAttendances,
  labelAllTime,
  labelThisPeriod,
  labelWeek,
  labelWeekPrev,
  labelWeekNext,
  labelAllBarbers,
  labelBarber,
}: BarberProductivityByDayChartProps) {
  const hasPeriod = inPeriod && inPeriod.length > 0;

  const rawData =
    timeScope === 'week' && weekData && weekData.length > 0
      ? weekData
      : timeScope === 'period' && hasPeriod
        ? inPeriod!
        : allTime;

  const filtered =
    selectedBarberId === null ? aggregateToAverage(rawData, labelAllBarbers) : filterByBarber(rawData, selectedBarberId);
  const byBarber = buildBarberDayMap(filtered);
  const barbersToShow = selectedBarberId === null ? [{ barberId: 0, barberName: labelAllBarbers }] : barbers.filter((b) => b.id === selectedBarberId).map((b) => ({ barberId: b.id, barberName: b.name }));
  const barAreaHeight = 180;

  if (barbersToShow.length === 0 && rawData.length === 0) {
    return (
      <p className="text-sm text-white/60 py-4">
        No productivity data by day yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-white/70">{labelBarber}:</span>
        <select
          value={selectedBarberId === null ? '' : selectedBarberId}
          onChange={(e) => onBarberChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--shop-accent)]"
        >
          <option value="">{labelAllBarbers}</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-white/70">Data:</span>
        <select
          value={timeScope}
          onChange={(e) => onTimeScopeChange(e.target.value as ProductivityTimeScope)}
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--shop-accent)]"
        >
          <option value="all_time">{labelAllTime}</option>
          {hasPeriod && <option value="period">{labelThisPeriod}</option>}
          <option value="week">{labelWeek}</option>
        </select>
        {timeScope === 'week' && weekOptions && weekOptions.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => {
                const idx = weekOptions.findIndex((o) => o.value === (selectedWeekStart ?? ''));
                if (idx < weekOptions.length - 1) onWeekSelect(weekOptions[idx + 1]!.value);
              }}
              disabled={weekOptions.findIndex((o) => o.value === (selectedWeekStart ?? '')) >= weekOptions.length - 1}
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={labelWeekPrev}
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <select
              value={selectedWeekStart ?? ''}
              onChange={(e) => onWeekSelect(e.target.value || null)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--shop-accent)] min-w-[180px]"
            >
              {weekOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const idx = weekOptions.findIndex((o) => o.value === (selectedWeekStart ?? ''));
                if (idx > 0) onWeekSelect(weekOptions[idx - 1]!.value);
              }}
              disabled={weekOptions.findIndex((o) => o.value === (selectedWeekStart ?? '')) <= 0}
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={labelWeekNext}
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </>
        )}
        {timeScope === 'week' && weekLabel && (
          <span className="text-sm text-white/60">{weekLabel}</span>
        )}
      </div>

      {barbersToShow.map(({ barberId, barberName }) => {
        const dayMap = byBarber.get(barberId);
        const values = DAY_ORDER.map((d) => dayMap?.get(d));
        const maxMinutes = Math.max(1, ...values.map((v) => (v ? v.avgDurationMinutes : 0)));

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
                const dayName = row?.dayName ?? DAY_NAMES[dayOfWeek];
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
