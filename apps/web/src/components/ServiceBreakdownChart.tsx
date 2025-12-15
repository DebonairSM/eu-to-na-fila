interface ServiceBreakdownChartProps {
  data: Array<{ serviceId: number; serviceName: string; count: number; percentage: number }>;
}

const colors = [
  '#D4AF37',
  '#E8C547',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

export function ServiceBreakdownChart({ data }: ServiceBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-white/50">
        <p>Nenhum dado disponível</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  let currentAngle = 0;
  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  const segments = data.map((item, index) => {
    const percentage = item.percentage / 100;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    return {
      ...item,
      pathData,
      color: colors[index % colors.length],
      startAngle,
      endAngle,
    };
  });

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8">
      <div className="flex-shrink-0">
        <svg width="200" height="200" viewBox="0 0 200 200" className="w-full max-w-[200px]">
          {segments.map((segment, index) => (
            <path
              key={segment.serviceId}
              d={segment.pathData}
              fill={segment.color}
              className="transition-opacity hover:opacity-80 cursor-pointer"
              style={{ opacity: 0.9 }}
            />
          ))}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.6}
            fill="#242424"
            className="pointer-events-none"
          />
          <text
            x={centerX}
            y={centerY - 5}
            textAnchor="middle"
            className="text-2xl font-semibold fill-[#D4AF37]"
            dominantBaseline="middle"
          >
            {total}
          </text>
          <text
            x={centerX}
            y={centerY + 15}
            textAnchor="middle"
            className="text-xs fill-white/70"
            dominantBaseline="middle"
          >
            Total
          </text>
        </svg>
      </div>
      <div className="flex-1 w-full space-y-3">
        {data.map((item, index) => (
          <div key={item.serviceId} className="flex items-center gap-4">
            <div
              className="w-4 h-4 rounded flex-shrink-0"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-white font-medium truncate">{item.serviceName}</span>
                <span className="text-[#D4AF37] font-semibold text-sm">{item.percentage}%</span>
              </div>
              <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: colors[index % colors.length],
                  }}
                />
              </div>
              <div className="text-xs text-white/50 mt-1">{item.count} atendimentos</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

