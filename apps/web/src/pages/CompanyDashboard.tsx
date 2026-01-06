import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { CompanyNav } from '@/components/CompanyNav';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export function CompanyDashboard() {
  const { logout, user } = useAuthContext();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<{
    totalShops: number;
    activeAds: number;
    totalAds: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.companyId) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await api.getCompanyDashboard(user.companyId);
      setDashboardData(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao carregar dados do dashboard'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen h-full bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />
      <main className="container max-w-[800px] mx-auto relative z-10 pt-24 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="text-center mb-10">
          <h1 className="font-['Playfair_Display',serif] text-2xl font-semibold text-[#D4AF37]">
            Dashboard Empresarial
          </h1>
          <p className="text-white/60 mt-2 text-sm">
            Gerencie suas barbearias e anúncios
          </p>
        </div>

        {loading && (
          <div className="text-center text-white/60 py-12">
            <div className="inline-block animate-spin text-[#D4AF37] text-4xl mb-4">
              <span className="material-symbols-outlined">refresh</span>
            </div>
            <p>Carregando...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {dashboardData && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-xl p-6">
              <div className="text-3xl text-[#D4AF37] mb-2">
                <span className="material-symbols-outlined">store</span>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {dashboardData.totalShops}
              </div>
              <div className="text-sm text-white/60">
                Barbearias
              </div>
            </div>

            <div className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-xl p-6">
              <div className="text-3xl text-[#D4AF37] mb-2">
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {dashboardData.activeAds}/{dashboardData.totalAds}
              </div>
              <div className="text-sm text-white/60">
                Anúncios Ativos
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Link
            to="/company/ads"
            className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1"
          >
            <div className="text-5xl text-[#D4AF37]">
              <span className="material-symbols-outlined">campaign</span>
            </div>
            <h2 className="text-2xl font-semibold text-white text-center">
              Gerenciar Anúncios
            </h2>
            <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
              arrow_forward
            </span>
          </Link>

          <Link
            to="/company/shops"
            className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1"
          >
            <div className="text-5xl text-[#D4AF37]">
              <span className="material-symbols-outlined">store</span>
            </div>
            <h2 className="text-2xl font-semibold text-white text-center">
              Gerenciar Barbearias
            </h2>
            <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
              arrow_forward
            </span>
          </Link>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-transparent text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.2)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all flex items-center gap-3 mx-auto text-sm"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sair
          </button>
        </div>
      </main>
    </div>
  );
}

