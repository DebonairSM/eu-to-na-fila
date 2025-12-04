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
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" text="Carregando analytics..." />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <ErrorDisplay error={error || new Error('Failed to load analytics')} />
        </div>
      </div>
    );
  }

  const stats = data.summary;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(212,175,55,0.05)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.05)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />
      <Navigation />
      <div className="dashboard-container show p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto relative z-10 pt-24 sm:pt-28 md:pt-40 lg:pt-44 xl:pt-48">
        {/* Header */}
        <div className="dashboard-header mb-6 sm:mb-10 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="dashboard-title font-['Playfair_Display',serif] text-[2rem] sm:text-[3.5rem] text-white bg-gradient-to-r from-[#D4AF37] to-[#E8C547] bg-clip-text text-transparent">
              Analytics
            </h1>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)] rounded-lg text-white text-sm cursor-pointer focus:outline-none focus:border-[#D4AF37]"
            >
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </div>
          <p className="dashboard-subtitle text-[rgba(255,255,255,0.7)] text-base sm:text-lg">
            Estatísticas e métricas de desempenho
          </p>
        </div>

        {/* Hero Stats Grid */}
        <div className="hero-stats grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-5 mb-6 sm:mb-10">
          <div className="hero-stat total bg-[#242424] border-2 border-transparent rounded-[20px] p-4 sm:p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#D4AF37] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-3xl sm:text-5xl font-semibold text-[#D4AF37] mb-2 relative z-10">
              {stats.total}
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Total
            </div>
          </div>
          <div className="hero-stat completed bg-[#242424] border-2 border-transparent rounded-[20px] p-4 sm:p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#22c55e] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-3xl sm:text-5xl font-semibold text-[#22c55e] mb-2 relative z-10">
              {stats.completed}
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Concluídos
            </div>
          </div>
          <div className="hero-stat cancelled bg-[#242424] border-2 border-transparent rounded-[20px] p-4 sm:p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#ef4444] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-3xl sm:text-5xl font-semibold text-[#ef4444] mb-2 relative z-10">
              {stats.cancelled}
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Cancelados
            </div>
          </div>
          <div className="hero-stat rate bg-[#242424] border-2 border-transparent rounded-[20px] p-4 sm:p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#D4AF37] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-3xl sm:text-5xl font-semibold text-[#D4AF37] mb-2 relative z-10">
              {stats.completionRate}%
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Taxa Conclusão
            </div>
          </div>
          <div className="hero-stat avg bg-[#242424] border-2 border-transparent rounded-[20px] p-4 sm:p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#3b82f6] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-3xl sm:text-5xl font-semibold text-[#3b82f6] mb-2 relative z-10">
              {stats.avgPerDay}
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Média/Dia
            </div>
          </div>
          <div className="hero-stat serviceTime bg-[#242424] border-2 border-transparent rounded-[20px] p-4 sm:p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#3b82f6] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-3xl sm:text-5xl font-semibold text-[#3b82f6] mb-2 relative z-10">
              {stats.avgServiceTime}m
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Serviço Médio
            </div>
          </div>
        </div>

        {/* Daily Chart */}
        <div className="chart-card bg-[#242424] border border-[rgba(255,255,255,0.05)] rounded-3xl p-4 sm:p-8 mb-6 sm:mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E8C547]" />
          <div className="section-title font-['Playfair_Display',serif] text-xl sm:text-[1.75rem] text-white mb-4 sm:mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#D4AF37] text-2xl sm:text-3xl">bar_chart</span>
            Atendimentos por Dia
          </div>
          <DailyChart data={data.ticketsByDay} />
        </div>

        {/* Hourly Chart */}
        <div className="chart-card bg-[#242424] border border-[rgba(255,255,255,0.05)] rounded-3xl p-4 sm:p-8 mb-6 sm:mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E8C547]" />
          <div className="section-title font-['Playfair_Display',serif] text-xl sm:text-[1.75rem] text-white mb-4 sm:mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#D4AF37] text-2xl sm:text-3xl">schedule</span>
            Atendimentos por Hora
          </div>
          <HourlyChart data={data.hourlyDistribution} peakHour={data.peakHour} />
        </div>

        {/* Peak Hour Card */}
        {data.peakHour && (
          <div className="peak-hour-card bg-gradient-to-br from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.3)] rounded-3xl p-6 sm:p-10 text-center mb-6 sm:mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.1)_0%,transparent_70%)] animate-spin-slow pointer-events-none" />
            <p className="text-sm text-[rgba(255,255,255,0.7)] uppercase tracking-wider mb-2 relative z-10">
              Horário de Pico
            </p>
            <div className="peak-hour-value font-['Playfair_Display',serif] text-4xl sm:text-5xl font-semibold text-[#D4AF37] mb-2 relative z-10 drop-shadow-[0_0_30px_rgba(212,175,55,0.5)]">
              {data.peakHour.hour}:00
            </div>
            <p className="text-sm text-[rgba(255,255,255,0.7)] relative z-10">
              {data.peakHour.count} {data.peakHour.count === 1 ? 'atendimento' : 'atendimentos'}
            </p>
          </div>
        )}

        {/* Barber Stats */}
        {data.barbers.length > 0 && (
          <div className="chart-card bg-[#242424] border border-[rgba(255,255,255,0.05)] rounded-3xl p-4 sm:p-8 mb-6 sm:mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E8C547]" />
            <div className="section-title font-['Playfair_Display',serif] text-xl sm:text-[1.75rem] text-white mb-4 sm:mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#D4AF37] text-2xl sm:text-3xl">content_cut</span>
              Desempenho por Barbeiro
            </div>
            <div className="barbers-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {data.barbers.map((barber) => (
                <div
                  key={barber.id}
                  className="barber-card bg-[rgba(36,36,36,0.8)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-4 sm:p-6 flex items-center gap-4 sm:gap-6 transition-all hover:border-[#D4AF37] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(212,175,55,0.2)] relative overflow-hidden"
                >
                  <div className="barber-avatar w-14 h-14 sm:w-[70px] sm:h-[70px] bg-gradient-to-br from-[#D4AF37] to-[#E8C547] rounded-full flex items-center justify-center text-xl sm:text-[1.75rem] font-semibold text-[#0a0a0a] flex-shrink-0 shadow-[0_4px_20px_rgba(212,175,55,0.3)]">
                    {barber.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="barber-info flex-1 min-w-0">
                    <h4 className="text-lg sm:text-xl text-white mb-2 truncate">{barber.name}</h4>
                    <div className="barber-stats-row flex gap-3 sm:gap-5">
                      <div className="barber-stat text-center">
                        <div className="barber-stat-value font-['Playfair_Display',serif] text-xl sm:text-[1.75rem] font-semibold text-[#D4AF37]">
                          {barber.totalServed}
                        </div>
                        <div className="barber-stat-label text-xs text-[rgba(255,255,255,0.5)] uppercase mt-1">
                          Atendidos
                        </div>
                      </div>
                      <div className="barber-stat text-center">
                        <div className="barber-stat-value font-['Playfair_Display',serif] text-xl sm:text-[1.75rem] font-semibold text-[#D4AF37]">
                          {barber.avgServiceTime}m
                        </div>
                        <div className="barber-stat-label text-xs text-[rgba(255,255,255,0.5)] uppercase mt-1">
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
    </div>
  );
}
