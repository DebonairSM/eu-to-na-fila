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
    <div className="min-h-screen h-full bg-[var(--shop-background)]">
      <Navigation />
      <main className="container max-w-[800px] mx-auto relative z-10 pt-24 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="text-center mb-10">
          <h1 className="font-['Playfair_Display',serif] text-2xl font-semibold text-[var(--shop-accent)]">
            Dashboard
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Link
            to="/manage"
            className="bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_12%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_6%,transparent)] border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-[var(--shop-accent)] hover:-translate-y-1"
          >
            <div className="text-5xl text-[var(--shop-accent)]">
              <span className="material-symbols-outlined">manage_accounts</span>
            </div>
            <h2 className="text-2xl font-semibold text-[var(--shop-text-primary)] text-center">
              Gerenciar Fila
            </h2>
            <span className="material-symbols-outlined text-[var(--shop-accent)] text-2xl">
              arrow_forward
            </span>
          </Link>

          <Link
            to="/analytics"
            className="bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_12%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_6%,transparent)] border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-[var(--shop-accent)] hover:-translate-y-1"
          >
            <div className="text-5xl text-[var(--shop-accent)]">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <h2 className="text-2xl font-semibold text-[var(--shop-text-primary)] text-center">
              Analytics
            </h2>
            <span className="material-symbols-outlined text-[var(--shop-accent)] text-2xl">
              arrow_forward
            </span>
          </Link>

          <Link
            to="/barbers"
            className="bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_12%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_6%,transparent)] border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-2xl p-10 flex flex-col items-center gap-4 transition-all hover:border-[var(--shop-accent)] hover:-translate-y-1"
          >
            <div className="text-5xl text-[var(--shop-accent)]">
              <span className="material-symbols-outlined">content_cut</span>
            </div>
            <h2 className="text-2xl font-semibold text-[var(--shop-text-primary)] text-center">
              Gerenciar Barbeiros
            </h2>
            <span className="material-symbols-outlined text-[var(--shop-accent)] text-2xl">
              arrow_forward
            </span>
          </Link>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-transparent text-[var(--shop-text-secondary)] border border-[var(--shop-border-color)] rounded-lg hover:border-[var(--shop-accent)] hover:text-[var(--shop-accent)] transition-all flex items-center gap-3 mx-auto text-sm"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sair
          </button>
        </div>
      </main>
    </div>
  );
}
