import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';

export function AnalyticsPage() {
  const { isOwner } = useAuthContext();
  const navigate = useNavigate();

  // Redirect if not owner
  if (!isOwner) {
    navigate('/staff');
    return null;
  }

  // Mock data for display
  const stats = {
    total: 124,
    completed: 118,
    cancelled: 6,
    waiting: 3,
    inProgress: 2,
    completionRate: 95.2,
    avgWaitTime: 12,
    avgServiceTime: 18,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(212,175,55,0.05)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.05)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />
      <Navigation />
      <div className="dashboard-container show p-10 max-w-[1600px] mx-auto relative z-10">
        {/* Header */}
        <div className="dashboard-header mb-10 text-center">
          <h1 className="dashboard-title font-['Playfair_Display',serif] text-[3.5rem] text-white mb-2 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="dashboard-subtitle text-[rgba(255,255,255,0.7)] text-lg">
            Estatísticas e métricas de desempenho
          </p>
        </div>

        {/* Hero Stats Grid */}
        <div className="hero-stats grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5 mb-10">
          <div className="hero-stat total bg-[#242424] border-2 border-transparent rounded-[20px] p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#D4AF37] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-5xl font-semibold text-[#D4AF37] mb-2 relative z-10">
              {stats.total}
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Total
            </div>
          </div>
          <div className="hero-stat completed bg-[#242424] border-2 border-transparent rounded-[20px] p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#22c55e] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-5xl font-semibold text-[#22c55e] mb-2 relative z-10">
              {stats.completed}
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Concluídos
            </div>
          </div>
          <div className="hero-stat cancelled bg-[#242424] border-2 border-transparent rounded-[20px] p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#ef4444] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-5xl font-semibold text-[#ef4444] mb-2 relative z-10">
              {stats.cancelled}
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Cancelados
            </div>
          </div>
          <div className="hero-stat rate bg-[#242424] border-2 border-transparent rounded-[20px] p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#D4AF37] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-5xl font-semibold text-[#D4AF37] mb-2 relative z-10">
              {stats.completionRate}%
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Taxa Conclusão
            </div>
          </div>
          <div className="hero-stat avg bg-[#242424] border-2 border-transparent rounded-[20px] p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#3b82f6] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-5xl font-semibold text-[#3b82f6] mb-2 relative z-10">
              {stats.avgWaitTime}m
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Espera Média
            </div>
          </div>
          <div className="hero-stat serviceTime bg-[#242424] border-2 border-transparent rounded-[20px] p-7 text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:scale-[1.02] hover:border-[#3b82f6] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer">
            <div className="hero-stat-value font-['Playfair_Display',serif] text-5xl font-semibold text-[#3b82f6] mb-2 relative z-10">
              {stats.avgServiceTime}m
            </div>
            <div className="hero-stat-label text-xs text-[rgba(255,255,255,0.7)] uppercase tracking-wider relative z-10">
              Serviço Médio
            </div>
          </div>
        </div>

        {/* Chart Cards */}
        <div className="chart-card bg-[#242424] border border-[rgba(255,255,255,0.05)] rounded-3xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E8C547]" />
          <div className="section-title font-['Playfair_Display',serif] text-[1.75rem] text-white mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#D4AF37] text-3xl">bar_chart</span>
            Atendimentos por Dia
          </div>
          <div className="text-center py-12 text-[rgba(255,255,255,0.7)]">
            Gráfico será implementado em breve
          </div>
        </div>

        <div className="chart-card bg-[#242424] border border-[rgba(255,255,255,0.05)] rounded-3xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E8C547]" />
          <div className="section-title font-['Playfair_Display',serif] text-[1.75rem] text-white mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#D4AF37] text-3xl">schedule</span>
            Atendimentos por Hora
          </div>
          <div className="text-center py-12 text-[rgba(255,255,255,0.7)]">
            Gráfico será implementado em breve
          </div>
        </div>
      </div>
    </div>
  );
}
