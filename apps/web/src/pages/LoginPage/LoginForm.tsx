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
    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-3xl sm:text-4xl lg:text-5xl text-[#0a0a0a]">
            lock
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Entrar</h1>
        <p className="text-sm sm:text-base text-[rgba(255,255,255,0.7)]">
          Acesso para funcionários e proprietários
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6">
        {/* Username */}
        <div className="text-field relative">
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder=" "
            autoComplete="username"
            required
            className="w-full px-4 py-3.5 sm:py-4 pt-5 sm:pt-6 rounded-lg border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] text-white placeholder:text-[rgba(255,255,255,0.5)] transition-all min-h-[52px]
              focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]
            "
          />
          <label
            htmlFor="username"
            className={`absolute left-4 text-sm sm:text-base text-[rgba(255,255,255,0.7)] pointer-events-none transition-all ${
              username ? 'top-2 text-xs text-[#D4AF37]' : 'top-4 sm:top-5'
            }`}
          >
            Usuário
          </label>
        </div>

        {/* Password */}
        <div className="password-field relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            autoComplete="current-password"
            required
            className="w-full px-4 py-3.5 sm:py-4 pt-5 sm:pt-6 pr-12 sm:pr-14 rounded-lg border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] text-white placeholder:text-[rgba(255,255,255,0.5)] transition-all min-h-[52px]
              focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]
            "
          />
          <label
            htmlFor="password"
            className={`absolute left-4 text-sm sm:text-base text-[rgba(255,255,255,0.7)] pointer-events-none transition-all ${
              password ? 'top-2 text-xs text-[#D4AF37]' : 'top-4 sm:top-5'
            }`}
          >
            Senha
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.7)] hover:text-white p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <span className="material-symbols-outlined text-xl sm:text-2xl">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="error-message p-4 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]">
            <p className="text-sm text-[#ef4444] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full px-6 py-4 min-h-[52px] bg-[#D4AF37] text-[#0a0a0a] font-semibold rounded-lg flex items-center justify-center gap-3 hover:bg-[#E8C547] hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
              Entrando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">login</span>
              Entrar
            </>
          )}
        </button>
      </form>

      {/* Demo Credentials - Collapsible, hidden by default */}
      <div className="border-t border-[rgba(255,255,255,0.1)] pt-4 sm:pt-5">
        <button
          type="button"
          onClick={() => setShowDemoCredentials(!showDemoCredentials)}
          className="w-full flex items-center justify-between text-sm text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.8)] transition-colors min-h-[44px]"
        >
          <span>Credenciais de demonstração</span>
          <span className="material-symbols-outlined text-xl transition-transform">
            {showDemoCredentials ? 'expand_less' : 'expand_more'}
          </span>
        </button>
        {showDemoCredentials && (
          <div className="mt-4 p-4 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
            <p className="text-xs text-[rgba(255,255,255,0.6)] text-center mb-3">
              Credenciais de acesso:
            </p>
            <div className="text-xs sm:text-sm text-[rgba(255,255,255,0.7)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#D4AF37]">admin_panel_settings</span>
                <span>Owner: owner / owner123</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#D4AF37]">content_cut</span>
                <span>Barber: barber / barber123</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#D4AF37]">tv</span>
                <span>Kiosk: kiosk / kiosk123</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Back Link */}
      <div className="text-center pt-2">
        <Link 
          to="/home" 
          className="text-sm text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] inline-flex items-center justify-center gap-2 min-h-[44px] transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
