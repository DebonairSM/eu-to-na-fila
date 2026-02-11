import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLogout } from '@/hooks/useLogout';
import { useLocale } from '@/contexts/LocaleContext';
import { CompanyNav } from '@/components/CompanyNav';
import { RootSiteNav } from '@/components/RootSiteNav';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { isRootBuild } from '@/lib/build';
import { Container } from '@/components/design-system/Spacing/Container';

export function CompanyDashboard() {
  const { user } = useAuthContext();
  const { t } = useLocale();
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
      setError(getErrorMessage(err, t('company.loadError')));
    } finally {
      setLoading(false);
    }
  };

  const { logoutAndGoHome } = useLogout();
  const handleLogout = () => logoutAndGoHome();

  const useRootTheme = isRootBuild();

  if (useRootTheme) {
    return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <RootSiteNav />
      <main className="py-20">
        <Container size="2xl">
        <div className="text-center mb-10">
          <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">{t('company.dashboardTitle')}</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
            {t('company.dashboardSubtitle')}
          </p>
        </div>

        {loading && (
          <div className="text-center text-gray-400 py-12">
            <div className="inline-block animate-spin text-blue-400 text-4xl mb-4">
              <span className="material-symbols-outlined">refresh</span>
            </div>
            <p>{t('company.loading')}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {dashboardData && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-xl p-6">
              <div className="text-3xl text-blue-400 mb-2">
                <span className="material-symbols-outlined">store</span>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {dashboardData.totalShops}
              </div>
              <div className="text-sm text-gray-400">
                {t('company.shops')}
              </div>
            </div>

            <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-xl p-6">
              <div className="text-3xl text-blue-400 mb-2">
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {dashboardData.activeAds}/{dashboardData.totalAds}
              </div>
              <div className="text-sm text-gray-400">
                {t('company.activeAds')}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            to="/company/ads"
            className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-white/20 hover:bg-white/10"
          >
            <div className="text-5xl text-blue-400">
              <span className="material-symbols-outlined">campaign</span>
            </div>
            <h2 className="text-2xl font-light text-white text-center">
              {t('company.manageAds')}
            </h2>
            <span className="material-symbols-outlined text-blue-400 text-2xl">
              arrow_forward
            </span>
          </Link>

          <Link
            to="/company/shops"
            className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-white/20 hover:bg-white/10"
          >
            <div className="text-5xl text-blue-400">
              <span className="material-symbols-outlined">store</span>
            </div>
            <h2 className="text-2xl font-light text-white text-center">
              {t('company.manageShops')}
            </h2>
            <span className="material-symbols-outlined text-blue-400 text-2xl">
              arrow_forward
            </span>
          </Link>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-transparent text-gray-400 border border-white/20 rounded-lg hover:border-white/40 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3 mx-auto text-sm"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            {t('company.logout')}
          </button>
        </div>
        </Container>
      </main>
    </div>
    );
  }

  // Mineiro build
  return (
    <div className="min-h-screen h-full bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />
      <main className="relative z-10 pt-20 sm:pt-24 pb-12 sm:pb-16 lg:pb-20">
        <Container size="2xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
              {t('company.dashboardTitle')}
            </h1>
            <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto mt-2">
              {t('company.dashboardSubtitle')}
            </p>
          </div>

          {loading && (
            <div className="text-center text-white/60 py-12">
              <div className="inline-block animate-spin text-[#D4AF37] text-4xl mb-4">
                <span className="material-symbols-outlined">refresh</span>
              </div>
              <p>{t('company.loading')}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {dashboardData && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="border border-white/10 bg-white/5 rounded-xl p-6">
                <div className="text-3xl text-[#D4AF37] mb-2">
                  <span className="material-symbols-outlined">store</span>
                </div>
                <div className="text-2xl font-semibold text-white mb-1">
                  {dashboardData.totalShops}
                </div>
                <div className="text-sm text-white/60">
                  {t('company.shops')}
                </div>
              </div>

              <div className="border border-white/10 bg-white/5 rounded-xl p-6">
                <div className="text-3xl text-[#D4AF37] mb-2">
                  <span className="material-symbols-outlined">campaign</span>
                </div>
                <div className="text-2xl font-semibold text-white mb-1">
                  {dashboardData.activeAds}/{dashboardData.totalAds}
                </div>
                <div className="text-sm text-white/60">
                  {t('company.activeAds')}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <Link
              to="/company/ads"
              className="border border-white/10 bg-white/5 rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-white/20 hover:bg-white/[0.07]"
            >
              <div className="text-5xl text-[#D4AF37]">
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <h2 className="text-2xl font-semibold text-white text-center">
                {t('company.manageAds')}
              </h2>
              <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
                arrow_forward
              </span>
            </Link>

            <Link
              to="/company/shops"
              className="border border-white/10 bg-white/5 rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-white/20 hover:bg-white/[0.07]"
            >
              <div className="text-5xl text-[#D4AF37]">
                <span className="material-symbols-outlined">store</span>
              </div>
              <h2 className="text-2xl font-semibold text-white text-center">
                {t('company.manageShops')}
              </h2>
              <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 border border-white/20 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-3 mx-auto text-sm"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              {t('company.logout')}
            </button>
          </div>
        </Container>
      </main>
    </div>
  );
}

