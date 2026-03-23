export interface BarberServiceWeekdayStatsRow {
  barberId?: number;
  barberName?: string;
  serviceId: number;
  serviceName: string;
  dayOfWeek: number;
  dayName: string;
  avgDurationMinutes: number;
  totalCompleted: number;
}

interface BarberServiceWeekdayStatsTableProps {
  rows: BarberServiceWeekdayStatsRow[];
  showBarberColumn: boolean;
  emptyMessage: string;
  labelBarber: string;
  labelDay: string;
  labelService: string;
  labelAvgMinutes: string;
  labelAttendances: string;
}

export function BarberServiceWeekdayStatsTable({
  rows,
  showBarberColumn,
  emptyMessage,
  labelBarber,
  labelDay,
  labelService,
  labelAvgMinutes,
  labelAttendances,
}: BarberServiceWeekdayStatsTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-white/60">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="text-white/50 border-b border-white/10">
            {showBarberColumn && <th className="py-2 pr-4">{labelBarber}</th>}
            <th className="py-2 pr-4">{labelDay}</th>
            <th className="py-2 pr-4">{labelService}</th>
            <th className="py-2 pr-4 text-right">{labelAvgMinutes}</th>
            <th className="py-2 text-right">{labelAttendances}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.barberId ?? 'barber'}-${row.serviceId}-${row.dayOfWeek}-${index}`}
              className="border-b border-white/5"
            >
              {showBarberColumn && <td className="py-2 pr-4 text-white/80">{row.barberName ?? '—'}</td>}
              <td className="py-2 pr-4 text-white/80">{row.dayName}</td>
              <td className="py-2 pr-4 text-white/90">{row.serviceName}</td>
              <td className="py-2 pr-4 text-right text-[var(--shop-accent)] font-medium">{row.avgDurationMinutes}</td>
              <td className="py-2 text-right text-white/70">{row.totalCompleted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
