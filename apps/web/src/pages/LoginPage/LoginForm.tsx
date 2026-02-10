import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoginForm } from './hooks/useLoginForm';

export function LoginForm() {
  const {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    handleSubmit,
  } = useLoginForm();

  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-4xl text-[var(--shop-text-on-accent)]">
            lock
          </span>
        </div>
        <p className="text-sm text-[var(--shop-text-secondary)]">
          Acesso restrito
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder=" "
            autoComplete="username"
            aria-describedby="username-hint"
            className="w-full px-4 py-4 pt-6 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base placeholder:text-[var(--shop-text-secondary)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)]"
          />
          <label
            htmlFor="username"
            className={`absolute left-4 text-sm text-[var(--shop-text-secondary)] pointer-events-none transition-all ${
              username ? 'top-2 text-xs text-[var(--shop-accent)]' : 'top-4'
            }`}
          >
            Usuário <span className="text-white/40">(barbeiros)</span>
          </label>
        </div>
        <p id="username-hint" className="text-xs text-white/40 mt-1 mb-2">
          Deixe em branco para login com senha (dono/funcionário)
        </p>

        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            autoComplete="current-password"
            required
            className="w-full px-4 py-4 pt-6 pr-12 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base placeholder:text-[var(--shop-text-secondary)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)]"
          />
          <label
            htmlFor="password"
            className={`absolute left-4 text-sm text-[var(--shop-text-secondary)] pointer-events-none transition-all ${
              password ? 'top-2 text-xs text-[var(--shop-accent)]' : 'top-4'
            }`}
          >
            Senha
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <span className="material-symbols-outlined text-xl">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]">
            <p className="text-sm text-[#ef4444] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </p>
          </div>
        )}

        <button
          type="submit"
          className="w-full px-6 py-4 min-h-[52px] bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-semibold rounded-lg flex items-center justify-center gap-3 hover:bg-[var(--shop-accent-hover)] transition-all disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
              Entrando...
            </>
          ) : (
            <span className="material-symbols-outlined text-xl">login</span>
          )}
        </button>
      </form>

      <div className="border-t border-[var(--shop-border-color)] pt-4">
        <button
          type="button"
          onClick={() => setShowDemoCredentials(!showDemoCredentials)}
          className="w-full flex items-center justify-between text-xs text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] transition-colors min-h-[44px]"
        >
          <span>Credenciais de teste</span>
          <span className="material-symbols-outlined text-lg transition-transform">
            {showDemoCredentials ? 'expand_less' : 'expand_more'}
          </span>
        </button>
        {showDemoCredentials && (
          <div className="mt-3 p-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--shop-border-color)]">
            <div className="text-xs text-[var(--shop-text-secondary)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[var(--shop-accent)]">admin_panel_settings</span>
                <span>Dono: usuário em branco / senha 123456</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[var(--shop-accent)]">badge</span>
                <span>Funcionário: usuário em branco / senha 000000</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[var(--shop-accent)]">content_cut</span>
                <span>Barbeiro: barber / barber123</span>
              </div>
            </div>
          </div>
        )}
      </div>


      <div className="text-center pt-2">
        <Link 
          to="/home" 
          className="text-sm text-[var(--shop-text-secondary)] hover:text-[var(--shop-accent)] inline-flex items-center justify-center gap-2 min-h-[44px] transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Voltar
        </Link>
      </div>
    </div>
  );
}
