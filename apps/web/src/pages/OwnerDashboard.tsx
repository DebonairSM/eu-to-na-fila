import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';

export function OwnerDashboard() {
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416]">
      <Navigation />
      <main className="container max-w-[800px] mx-auto relative z-10 pt-24 px-4 sm:px-6 lg:px-10 pb-12">
        {/* Header */}
        <div className="header text-center mb-8 sm:mb-10">
          <h1 className="title font-['Playfair_Display',serif] text-xl sm:text-2xl font-semibold text-[#D4AF37]">
            Dashboard
          </h1>
        </div>

        {/* Options Grid */}
        <div className="options-grid grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8">
          <Link
            to="/manage"
            className="option-card bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-8 sm:p-10 flex flex-col items-center gap-4 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1"
          >
            <div className="option-icon text-[48px] sm:text-[56px] text-[#D4AF37]">
              <span className="material-symbols-outlined">manage_accounts</span>
            </div>
            <h2 className="option-title text-xl sm:text-2xl font-semibold text-white text-center">
              Gerenciar Fila
            </h2>
            <p className="option-desc text-center text-sm sm:text-base text-[rgba(255,255,255,0.7)]">
              Visualize e gerencie a fila de clientes, atribua barbeiros e monitore o atendimento.
            </p>
            <span className="material-symbols-outlined text-[#D4AF37] text-xl sm:text-2xl mt-2">
              arrow_forward
            </span>
          </Link>

          <Link
            to="/analytics"
            className="option-card bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-8 sm:p-10 flex flex-col items-center gap-4 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1"
          >
            <div className="option-icon text-[48px] sm:text-[56px] text-[#D4AF37]">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <h2 className="option-title text-xl sm:text-2xl font-semibold text-white text-center">
              Analytics
            </h2>
            <p className="option-desc text-center text-sm sm:text-base text-[rgba(255,255,255,0.7)]">
              Visualize estatísticas, métricas de desempenho e gráficos de atendimentos.
            </p>
            <span className="material-symbols-outlined text-[#D4AF37] text-xl sm:text-2xl mt-2">
              arrow_forward
            </span>
          </Link>

          <Link
            to="/barbers"
            className="option-card bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-8 sm:p-10 flex flex-col items-center gap-4 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1 md:col-span-2 md:max-w-md md:mx-auto"
          >
            <div className="option-icon text-[48px] sm:text-[56px] text-[#D4AF37]">
              <span className="material-symbols-outlined">content_cut</span>
            </div>
            <h2 className="option-title text-xl sm:text-2xl font-semibold text-white text-center">
              Gerenciar Barbeiros
            </h2>
            <p className="option-desc text-center text-sm sm:text-base text-[rgba(255,255,255,0.7)]">
              Adicione, edite ou remova barbeiros da equipe.
            </p>
            <span className="material-symbols-outlined text-[#D4AF37] text-xl sm:text-2xl mt-2">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Logout */}
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
