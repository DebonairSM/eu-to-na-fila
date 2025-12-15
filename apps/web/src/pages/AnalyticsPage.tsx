import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { DailyChart } from '@/components/DailyChart';
import { HourlyChart } from '@/components/HourlyChart';

interface AnalyticsData {
  period: {
    days: number;
    since: string;
    until: string;
  };
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    waiting: number;
    inProgress: number;
    completionRate: number;
    cancellationRate: number;
    avgPerDay: number;
    avgServiceTime: number;
  };
  barbers: Array<{
    id: number;
    name: string;
    totalServed: number;
    avgServiceTime: number;
    isPresent: boolean;
  }>;
  ticketsByDay: Record<string, number>;
  hourlyDistribution: Record<number, number>;
  peakHour: { hour: number; count: number } | null;
}

export function AnalyticsPage() {
  const { isOwner } = useAuthContext();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Redirect if not owner
  if (!isOwner) {
    navigate('/staff');
    return null;
  }

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const analyticsData = await api.getAnalytics(config.slug, days);
        setData(analyticsData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        } else if (err && typeof err === 'object' && 'error' in err) {
          setError(new Error((err as { error: string }).error));
        } else {
          setError(new Error('Erro ao carregar analytics. Tente novamente.'));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [days]);

  if (isLoading) {
    return (
      <div className="min-h-screen h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416]">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-24">
          <LoadingSpinner size="lg" text="Carregando analytics..." />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416]">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-24">
          <ErrorDisplay error={error || new Error('Failed to load analytics')} />
        </div>
      </div>
    );
  }

  const stats = data.summary;

  return (
    <div className="min-h-screen h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416]">
      <Navigation />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-32 pb-12">
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="font-['Playfair_Display',serif] text-4xl sm:text-5xl md:text-6xl text-white mb-3">
                Analytics
              </h1>
            </div>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-4 py-2.5 bg-[#1a1a1a] border border-[rgba(255,255,255,0.15)] rounded-xl text-white text-base cursor-pointer focus:outline-none focus:border-[#D4AF37] transition-colors"
            >
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-10">
          <div className="bg-[#242424] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[#D4AF37] mb-2">
              {stats.total}
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              Total
            </div>
          </div>
          <div className="bg-[#242424] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[#22c55e] mb-2">
              {stats.completed}
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              Concluídos
            </div>
          </div>
          <div className="bg-[#242424] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[#ef4444] mb-2">
              {stats.cancelled}
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              Cancelados
            </div>
          </div>
          <div className="bg-[#242424] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[#D4AF37] mb-2">
              {stats.completionRate}%
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              Taxa Conclusão
            </div>
          </div>
          <div className="bg-[#242424] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[#3b82f6] mb-2">
              {stats.avgPerDay}
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              Média/Dia
            </div>
          </div>
          <div className="bg-[#242424] border-2 border-transparent rounded-2xl p-6 text-center">
            <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-semibold text-[#3b82f6] mb-2">
              {stats.avgServiceTime}m
            </div>
            <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
              Serviço Médio
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[#242424] border border-[rgba(255,255,255,0.05)] rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E8C547]" />
            <div className="mb-6 flex items-center gap-4">
              <span className="material-symbols-outlined text-[#D4AF37] text-3xl">bar_chart</span>
              <h2 className="font-['Playfair_Display',serif] text-3xl text-white">
                Atendimentos por Dia
              </h2>
            </div>
            <DailyChart data={data.ticketsByDay} />
          </div>

          <div className="bg-[#242424] border border-[rgba(255,255,255,0.05)] rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E8C547]" />
            <div className="mb-6 flex items-center gap-4">
              <span className="material-symbols-outlined text-[#D4AF37] text-3xl">schedule</span>
              <h2 className="font-['Playfair_Display',serif] text-3xl text-white">
                Atendimentos por Hora
              </h2>
            </div>
            <HourlyChart data={data.hourlyDistribution} peakHour={data.peakHour} />
          </div>

          {data.peakHour && (
            <div className="bg-gradient-to-br from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.3)] rounded-3xl p-10 text-center">
              <p className="text-sm text-white/70 uppercase tracking-wider mb-3">
                Horário de Pico
              </p>
              <div className="font-['Playfair_Display',serif] text-6xl font-semibold text-[#D4AF37] mb-3">
                {data.peakHour.hour}:00
              </div>
              <p className="text-base text-white/70">
                {data.peakHour.count} {data.peakHour.count === 1 ? 'atendimento' : 'atendimentos'}
              </p>
            </div>
          )}

          {data.barbers.length > 0 && (
            <div className="bg-[#242424] border border-[rgba(255,255,255,0.05)] rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E8C547]" />
              <div className="mb-6 flex items-center gap-4">
                <span className="material-symbols-outlined text-[#D4AF37] text-3xl">content_cut</span>
                <h2 className="font-['Playfair_Display',serif] text-3xl text-white">
                  Desempenho por Barbeiro
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.barbers.map((barber) => (
                  <div
                    key={barber.id}
                    className="bg-[rgba(36,36,36,0.8)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 flex items-center gap-6"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] rounded-full flex items-center justify-center text-2xl font-semibold text-[#0a0a0a] flex-shrink-0">
                      {barber.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl text-white mb-3 truncate">{barber.name}</h4>
                      <div className="flex gap-6">
                        <div className="text-center">
                          <div className="font-['Playfair_Display',serif] text-2xl font-semibold text-[#D4AF37]">
                            {barber.totalServed}
                          </div>
                          <div className="text-xs text-white/50 uppercase mt-1">
                            Atendidos
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-['Playfair_Display',serif] text-2xl font-semibold text-[#D4AF37]">
                            {barber.avgServiceTime}m
                          </div>
                          <div className="text-xs text-white/50 uppercase mt-1">
                            Média
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
