import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';

export function StaffPage() {
  const { user, logout, isOwner } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416]">
      <Navigation />
      <main className="container max-w-[800px] mx-auto relative z-10 animate-in fade-in-up pt-24 px-4 sm:px-6 pb-12">
        {/* Header */}
        <div className="header text-center mb-8 sm:mb-10">
          <h1 className="title text-2xl sm:text-3xl md:text-[42px] font-bold text-[#D4AF37] mb-2 sm:mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            Painel do Funcionário
          </h1>
          <p className="subtitle text-base sm:text-lg text-[rgba(255,255,255,0.7)]">
            Bem-vindo, {user?.name || user?.username || 'Funcionário'}
          </p>
        </div>

        {/* Dashboard Options */}
        <div className="options-grid grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-10">
          {/* Queue Management */}
          <Link
            to="/manage"
            className="option-card bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl sm:rounded-[28px] p-6 sm:p-8 md:p-12 flex flex-col items-center gap-3 sm:gap-5 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
            aria-label="Gerenciar Fila - Visualize e gerencie a fila de clientes"
          >
            <div className="option-icon text-[48px] sm:text-[56px] md:text-[64px] text-[#D4AF37]" aria-hidden="true">
              <span className="material-symbols-outlined">manage_accounts</span>
            </div>
            <h2 className="option-title text-xl sm:text-2xl font-semibold text-white text-center">
              Gerenciar Fila
            </h2>
            <p className="option-desc text-center text-sm sm:text-base text-[rgba(255,255,255,0.7)]">
              Visualize e gerencie a fila de clientes
            </p>
            <span className="material-symbols-outlined text-[#D4AF37] text-xl sm:text-2xl" aria-hidden="true">
              arrow_forward
            </span>
          </Link>

          {/* Analytics (Owner only) */}
          {isOwner && (
            <Link
              to="/analytics"
              className="option-card bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl sm:rounded-[28px] p-6 sm:p-8 md:p-12 flex flex-col items-center gap-3 sm:gap-5 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
              aria-label="Analytics - Visualize estatísticas e métricas"
            >
              <div className="option-icon text-[48px] sm:text-[56px] md:text-[64px] text-[#D4AF37]" aria-hidden="true">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <h2 className="option-title text-xl sm:text-2xl font-semibold text-white text-center">
                Analytics
              </h2>
              <p className="option-desc text-center text-sm sm:text-base text-[rgba(255,255,255,0.7)]">
                Visualize estatísticas e métricas
              </p>
              <span className="material-symbols-outlined text-[#D4AF37] text-xl sm:text-2xl" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          )}

          {/* Barber Management (Owner only) */}
          {isOwner && (
            <Link
              to="/barbers"
              className="option-card bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl sm:rounded-[28px] p-6 sm:p-8 md:p-12 flex flex-col items-center gap-3 sm:gap-5 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
              aria-label="Gerenciar Barbeiros - Adicione, edite ou remova barbeiros"
            >
              <div className="option-icon text-[48px] sm:text-[56px] md:text-[64px] text-[#D4AF37]" aria-hidden="true">
                <span className="material-symbols-outlined">content_cut</span>
              </div>
              <h2 className="option-title text-xl sm:text-2xl font-semibold text-white text-center">
                Gerenciar Barbeiros
              </h2>
              <p className="option-desc text-center text-sm sm:text-base text-[rgba(255,255,255,0.7)]">
                Adicione, edite ou remova barbeiros
              </p>
              <span className="material-symbols-outlined text-[#D4AF37] text-xl sm:text-2xl" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          )}

          {/* Kiosk Mode */}
          <Link
            to="/manage?kiosk=true"
            className="option-card bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl sm:rounded-[28px] p-6 sm:p-8 md:p-12 flex flex-col items-center gap-3 sm:gap-5 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
            aria-label="Modo Kiosk - Exibição em tela cheia para TV/tablet"
          >
            <div className="option-icon text-[48px] sm:text-[56px] md:text-[64px] text-[#D4AF37]" aria-hidden="true">
              <span className="material-symbols-outlined">tv</span>
            </div>
            <h2 className="option-title text-xl sm:text-2xl font-semibold text-white text-center">
              Modo Kiosk
            </h2>
            <p className="option-desc text-center text-sm sm:text-base text-[rgba(255,255,255,0.7)]">
              Exibição em tela cheia para TV/tablet
            </p>
            <span className="material-symbols-outlined text-[#D4AF37] text-xl sm:text-2xl" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Logout */}
        <div className="text-center">
          <button
            onClick={handleLogout}
            className="px-5 sm:px-6 py-2.5 sm:py-3 bg-transparent text-[rgba(255,255,255,0.7)] border-2 border-[rgba(255,255,255,0.3)] rounded-full hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all flex items-center gap-2 sm:gap-3 mx-auto text-sm sm:text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
            aria-label="Sair da conta"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl" aria-hidden="true">logout</span>
            Sair
          </button>
        </div>
      </main>
    </div>
  );
}
