import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';

export function OwnerDashboard() {
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  return (
    <div className="min-h-screen h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416]">
      <Navigation />
      <main className="container max-w-[800px] mx-auto relative z-10 pt-24 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="text-center mb-10">
          <h1 className="font-['Playfair_Display',serif] text-2xl font-semibold text-[#D4AF37]">
            Dashboard
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Link
            to="/manage"
            className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1"
          >
            <div className="text-5xl text-[#D4AF37]">
              <span className="material-symbols-outlined">manage_accounts</span>
            </div>
            <h2 className="text-2xl font-semibold text-white text-center">
              Gerenciar Fila
            </h2>
            <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
              arrow_forward
            </span>
          </Link>

          <Link
            to="/analytics"
            className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1"
          >
            <div className="text-5xl text-[#D4AF37]">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <h2 className="text-2xl font-semibold text-white text-center">
              Analytics
            </h2>
            <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
              arrow_forward
            </span>
          </Link>

          <Link
            to="/barbers"
            className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:-translate-y-1"
          >
            <div className="text-5xl text-[#D4AF37]">
              <span className="material-symbols-outlined">content_cut</span>
            </div>
            <h2 className="text-2xl font-semibold text-white text-center">
              Gerenciar Barbeiros
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
