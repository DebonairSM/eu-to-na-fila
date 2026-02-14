import { useLocale } from '@/contexts/LocaleContext';

interface TypeBreakdownChartProps {
  data: {
    walkin: number;
    appointment: number;
    walkinPercent: number;
    appointmentPercent: number;
  };
}

const WALKIN_COLOR = '#3b82f6';
const APPOINTMENT_COLOR = '#D4AF37';

export function TypeBreakdownChart({ data }: TypeBreakdownChartProps) {
  const { t } = useLocale();
  const total = data.walkin + data.appointment;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-white/50">
        <p>{t('common.noDataAvailable')}</p>
      </div>
    );
  }

  const walkinPct = data.walkinPercent;
  const appointmentPct = data.appointmentPercent;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      <div className="flex-shrink-0">
        <div className="w-32 h-32 rounded-full relative overflow-hidden flex items-center justify-center"
          style={{
            background: `conic-gradient(
              ${WALKIN_COLOR} 0deg ${walkinPct * 3.6}deg,
              ${APPOINTMENT_COLOR} ${walkinPct * 3.6}deg 360deg
            )`,
          }}
        >
          <div className="w-24 h-24 rounded-full bg-[var(--shop-surface-secondary)] flex items-center justify-center">
            <span className="font-['Playfair_Display',serif] text-2xl font-semibold text-white">{total}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: WALKIN_COLOR }} />
            <span className="text-white font-medium">{t('analytics.walkin')}</span>
          </div>
          <span className="text-white font-semibold">{data.walkin} ({walkinPct}%)</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${walkinPct}%`, backgroundColor: WALKIN_COLOR }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: APPOINTMENT_COLOR }} />
            <span className="text-white font-medium">{t('analytics.appointment')}</span>
          </div>
          <span className="text-white font-semibold">{data.appointment} ({appointmentPct}%)</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${appointmentPct}%`, backgroundColor: APPOINTMENT_COLOR }}
          />
        </div>
      </div>
    </div>
  );
}
