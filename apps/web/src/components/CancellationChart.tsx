interface CancellationChartProps {
  data: {
    rateByDay: Record<string, number>;
    rateByHour: Record<number, number>;
    avgTimeBeforeCancellation: number;
  };
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayLabels: Record<string, string> = {
  Monday: 'Seg',
  Tuesday: 'Ter',
  Wednesday: 'Qua',
  Thursday: 'Qui',
  Friday: 'Sex',
  Saturday: 'Sáb',
  Sunday: 'Dom',
};

export function CancellationChart({ data }: CancellationChartProps) {
  const maxRateByDay = Math.max(...Object.values(data.rateByDay), 1);
  const maxRateByHour = Math.max(...Object.values(data.rateByHour), 1);
  const dayChartHeight = 200;
  const dayLabelSpace = 50; // Reserved space for labels
  const hourChartHeight = 200;
  const hourLabelSpace = 35; // Reserved space for labels

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Taxa de cancelamento por dia</h3>
        <div className="flex items-start gap-2 sm:gap-3 h-[200px] py-5">
          {dayOrder.map((day) => {
            const rate = data.rateByDay[day] || 0;
            const height = maxRateByDay > 0 ? (rate / maxRateByDay) * (dayChartHeight - dayLabelSpace) : 4;

            return (
              <div key={day} className="flex-1 flex flex-col items-center h-full min-w-[40px] group">
                <div className="mb-3 text-[0.7rem] text-[rgba(255,255,255,0.7)] text-center font-medium">
                  {dayLabels[day]}
                </div>
                <div className="flex-1 flex items-end w-full">
                  <div
                    className="w-full bg-gradient-to-t from-[#ef4444] to-[#f87171] rounded-t-lg min-h-[4px] transition-all cursor-pointer relative"
                    style={{
                      height: `${height}px`,
                      animation: 'growUp 0.8s ease-out',
                    }}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-semibold text-[#ef4444] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[rgba(10,10,10,0.9)] px-1.5 py-0.5 rounded">
                      {rate}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Taxa de cancelamento por hora</h3>
        <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 sm:gap-2 h-[200px] py-5">
          {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
            const rate = data.rateByHour[hour] || 0;
            const height = maxRateByHour > 0 ? (rate / maxRateByHour) * (hourChartHeight - hourLabelSpace) : 4;

            return (
              <div key={hour} className="flex flex-col items-center relative h-full group">
                <div className="mb-2 text-[0.6rem] text-[rgba(255,255,255,0.5)] text-center font-medium">
                  {hour}h
                </div>
                <div className="flex-1 flex items-end w-full">
                  <div
                    className={`w-full bg-gradient-to-t from-[#f59e0b] to-[#fbbf24] rounded-t transition-all cursor-pointer relative ${
                      rate > 20 ? 'ring-2 ring-[#ef4444] ring-offset-1 ring-offset-[#242424]' : ''
                    }`}
                    style={{
                      height: `${height}px`,
                      animation: 'growUp 0.8s ease-out',
                    }}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[0.65rem] font-bold text-[#f59e0b] bg-[rgba(10,10,10,0.9)] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {rate}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.avgTimeBeforeCancellation > 0 && (
        <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-center">
          <p className="text-sm text-white/70 mb-1">Tempo médio antes do cancelamento</p>
          <p className="text-2xl font-semibold text-[#ef4444]">
            {data.avgTimeBeforeCancellation} minutos
          </p>
        </div>
      )}
    </div>
  );
}

