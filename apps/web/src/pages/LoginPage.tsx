import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { getErrorMessage } from '@/lib/utils';

// Demo credentials - In production, use real username/password authentication
const CREDENTIALS = {
  owner: { username: 'owner', password: 'owner123', pin: '1234' },
  barber: { username: 'barber', password: 'barber123', pin: '0000' },
  kiosk: { username: 'kiosk', password: 'kiosk123', pin: '0000' },
};

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Check credentials and get corresponding PIN
      let pin: string | null = null;
      let role: 'owner' | 'barber' = 'barber';
      let redirectTo = '/manage';
      let isKiosk = false;

      if (username === CREDENTIALS.owner.username && password === CREDENTIALS.owner.password) {
        pin = CREDENTIALS.owner.pin;
        role = 'owner';
        redirectTo = '/owner';
      } else if (username === CREDENTIALS.barber.username && password === CREDENTIALS.barber.password) {
        pin = CREDENTIALS.barber.pin;
        role = 'barber';
        redirectTo = '/manage';
      } else if (username === CREDENTIALS.kiosk.username && password === CREDENTIALS.kiosk.password) {
        pin = CREDENTIALS.kiosk.pin;
        role = 'barber'; // Kiosk uses staff-level access
        redirectTo = '/manage?kiosk=true';
        isKiosk = true;
      } else {
        setError('Credenciais inválidas. Verifique usuário e senha.');
        setIsLoading(false);
        return;
      }

      // Authenticate with API
      const result = await api.authenticate(config.slug, pin);

      if (result.valid && result.token) {
        // Login successful - token is stored in API client
        login({
          id: 1,
          username: username,
          role: isKiosk ? 'barber' : role,
          name: username,
        });

        navigate(redirectTo);
      } else {
        setError('Erro de autenticação. Tente novamente.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao fazer login. Tente novamente.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative flex items-center justify-center p-5">
      <Navigation />
      <div className="modal-backdrop fixed inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-md flex items-center justify-center z-40">
        <div className="modal bg-[rgba(255,255,255,0.98)] rounded-2xl p-4 sm:p-6 md:p-8 max-w-md w-full mx-3 sm:mx-4 shadow-[0px_4px_8px_3px_rgba(212,175,55,0.15),0px_1px_3px_rgba(0,0,0,0.2)] animate-in fade-in">
          <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-3xl sm:text-4xl text-[#0a0a0a]">
                  lock
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1B20]">Entrar</h1>
              <p className="text-sm sm:text-base text-[#5D5D5D]">Acesso para funcionários</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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
                  className="w-full px-3 py-3 pt-5 sm:px-4 sm:py-4 sm:pt-6 rounded border border-[#C4C4C4] bg-transparent text-[#1D1B20] transition-all focus:border-[#D4AF37] focus:border-2 focus:px-[11px] focus:pt-[19px] sm:focus:px-[15px] sm:focus:pt-[23px]"
                />
                <label
                  htmlFor="username"
                  className={`absolute left-3 sm:left-4 text-sm sm:text-base text-[#5D5D5D] pointer-events-none transition-all ${
                    username ? 'top-1.5 sm:top-2 text-xs text-[#D4AF37]' : 'top-3 sm:top-4'
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
                  className="w-full px-3 py-3 pt-5 pr-11 sm:px-4 sm:py-4 sm:pt-6 sm:pr-12 rounded border border-[#C4C4C4] bg-transparent text-[#1D1B20] transition-all focus:border-[#D4AF37] focus:border-2 focus:px-[11px] focus:pt-[19px] sm:focus:px-[15px] sm:focus:pt-[23px]"
                />
                <label
                  htmlFor="password"
                  className={`absolute left-3 sm:left-4 text-sm sm:text-base text-[#5D5D5D] pointer-events-none transition-all ${
                    password ? 'top-1.5 sm:top-2 text-xs text-[#D4AF37]' : 'top-3 sm:top-4'
                  }`}
                >
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[#5D5D5D] hover:bg-[#F5F5F5] p-2 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <span className="material-symbols-outlined text-xl sm:text-2xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="error-message p-3 rounded-lg bg-[rgba(186,26,26,0.1)] border border-[rgba(186,26,26,0.2)]">
                  <p className="text-sm text-[#BA1A1A]">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full px-4 py-3 sm:px-6 sm:py-4 min-h-[44px] bg-[#D4AF37] text-[#0a0a0a] font-semibold rounded-full flex items-center justify-center gap-3 hover:bg-[#E8C547] transition-all disabled:opacity-50"
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

            {/* Demo Credentials */}
            <div className="p-3 sm:p-4 rounded-lg bg-[#F5F5F5] border border-[#C4C4C4]">
              <p className="text-[10px] sm:text-xs text-[#5D5D5D] text-center mb-2">
                Credenciais de acesso:
              </p>
              <div className="text-[10px] sm:text-xs text-[#5D5D5D] space-y-1">
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

            {/* Back Link */}
            <div className="text-center">
              <Link to="/" className="text-sm text-[#5D5D5D] hover:text-[#D4AF37] inline-flex items-center justify-center min-h-[44px]">
                ← Voltar ao início
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
