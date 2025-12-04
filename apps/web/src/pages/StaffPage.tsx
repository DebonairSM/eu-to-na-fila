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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.03)_0%,transparent_70%)] animate-spin-slow pointer-events-none" />
      <Navigation />
      <div className="container max-w-[800px] mx-auto relative z-10 animate-in fade-in-up pt-24">
        {/* Header */}
        <div className="header text-center mb-12">
          <h1 className="title text-[42px] font-bold text-[#D4AF37] mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            Painel do Funcionário
          </h1>
          <p className="subtitle text-lg text-[rgba(255,255,255,0.7)]">
            Bem-vindo, {user?.name || user?.username || 'Funcionário'}
          </p>
        </div>

        {/* Dashboard Options */}
        <div className="options-grid grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Queue Management */}
          <Link
            to="/manage"
            className="option-card bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-[28px] p-12 flex flex-col items-center gap-5 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1"
          >
            <div className="option-icon text-[64px] text-[#D4AF37]">
              <span className="material-symbols-outlined">manage_accounts</span>
            </div>
            <h2 className="option-title text-2xl font-semibold text-white text-center">
              Gerenciar Fila
            </h2>
            <p className="option-desc text-center text-[rgba(255,255,255,0.7)]">
              Visualize e gerencie a fila de clientes
            </p>
            <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
              arrow_forward
            </span>
          </Link>

          {/* Analytics (Owner only) */}
          {isOwner && (
            <Link
              to="/analytics"
              className="option-card bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-[28px] p-12 flex flex-col items-center gap-5 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1"
            >
              <div className="option-icon text-[64px] text-[#D4AF37]">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <h2 className="option-title text-2xl font-semibold text-white text-center">
                Analytics
              </h2>
              <p className="option-desc text-center text-[rgba(255,255,255,0.7)]">
                Visualize estatísticas e métricas
              </p>
              <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
                arrow_forward
              </span>
            </Link>
          )}

          {/* Barber Management (Owner only) */}
          {isOwner && (
            <Link
              to="/barbers"
              className="option-card bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-[28px] p-12 flex flex-col items-center gap-5 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1"
            >
              <div className="option-icon text-[64px] text-[#D4AF37]">
                <span className="material-symbols-outlined">content_cut</span>
              </div>
              <h2 className="option-title text-2xl font-semibold text-white text-center">
                Gerenciar Barbeiros
              </h2>
              <p className="option-desc text-center text-[rgba(255,255,255,0.7)]">
                Adicione, edite ou remova barbeiros
              </p>
              <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
                arrow_forward
              </span>
            </Link>
          )}

          {/* Kiosk Mode */}
          <Link
            to="/manage?kiosk=true"
            className="option-card bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-[28px] p-12 flex flex-col items-center gap-5 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1"
          >
            <div className="option-icon text-[64px] text-[#D4AF37]">
              <span className="material-symbols-outlined">tv</span>
            </div>
            <h2 className="option-title text-2xl font-semibold text-white text-center">
              Modo Kiosk
            </h2>
            <p className="option-desc text-center text-[rgba(255,255,255,0.7)]">
              Exibição em tela cheia para TV/tablet
            </p>
            <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Logout */}
        <div className="text-center">
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-transparent text-[rgba(255,255,255,0.7)] border-2 border-[rgba(255,255,255,0.3)] rounded-full hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all flex items-center gap-2 mx-auto"
          >
            <span className="material-symbols-outlined">logout</span>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
