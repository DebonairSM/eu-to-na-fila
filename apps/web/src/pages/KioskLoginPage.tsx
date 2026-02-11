import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export function KioskLoginPage() {
  const shopSlug = useShopSlug();
  const { login } = useAuthContext();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(t('auth.fillAllFields') ?? 'Preencha usuário e senha.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const result = await api.authenticateKiosk(shopSlug, username.trim(), password);
      if (result.valid && result.token) {
        login({
          id: 0,
          username: 'kiosk',
          role: 'kiosk',
        });
        navigate('/manage?kiosk=true', { replace: true });
        return;
      }
      setError(t('auth.invalidCredentials') ?? 'Usuário ou senha incorretos.');
    } catch (err) {
      setError(getErrorMessage(err, t('auth.loginError') ?? 'Erro ao entrar. Tente novamente.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--shop-background)]">
      <Navigation />
      <div className="flex items-center justify-center min-h-screen px-4 sm:px-6 py-20 sm:py-24">
        <div className="w-full max-w-md min-w-[320px]">
          <div className="bg-[color-mix(in_srgb,var(--shop-surface-secondary)_95%,transparent)] backdrop-blur-sm border border-[var(--shop-border-color)] rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-4xl text-[var(--shop-text-on-accent)]">tv</span>
                </div>
                <h1 className="text-xl font-semibold text-[var(--shop-text-primary)]">
                  {t('auth.kioskLoginTitle') ?? 'Modo quiosque'}
                </h1>
                <p className="text-sm text-[var(--shop-text-secondary)]">
                  {t('auth.kioskLoginSubtitle') ?? 'Use as credenciais do quiosque para exibir a fila.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="relative">
                  <input
                    id="kiosk-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder=" "
                    autoComplete="username"
                    className="w-full px-4 py-4 pt-6 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base placeholder:text-[var(--shop-text-secondary)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)]"
                  />
                  <label
                    htmlFor="kiosk-username"
                    className={`absolute left-4 text-sm text-[var(--shop-text-secondary)] pointer-events-none transition-all ${
                      username ? 'top-2 text-xs text-[var(--shop-accent)]' : 'top-4'
                    }`}
                  >
                    {t('management.kioskUsername')}
                  </label>
                </div>

                <div className="relative">
                  <input
                    id="kiosk-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" "
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-4 pt-6 pr-12 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base placeholder:text-[var(--shop-text-secondary)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)]"
                  />
                  <label
                    htmlFor="kiosk-password"
                    className={`absolute left-4 text-sm text-[var(--shop-text-secondary)] pointer-events-none transition-all ${
                      password ? 'top-2 text-xs text-[var(--shop-accent)]' : 'top-4'
                    }`}
                  >
                    {t('management.kioskPassword')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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
                      {t('auth.entering')}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl">tv</span>
                      {t('auth.kioskEnter') ?? 'Abrir modo quiosque'}
                    </>
                  )}
                </button>
              </form>

              <div className="text-center space-y-2 pt-2">
                <Link
                  to="/shop/login"
                  className="text-sm text-[var(--shop-text-secondary)] hover:text-[var(--shop-accent)] inline-flex items-center justify-center gap-2 min-h-[44px] transition-colors"
                >
                  <span className="material-symbols-outlined text-base">login</span>
                  {t('auth.staffOrOwnerLogin') ?? 'Entrar como equipe ou dono'}
                </Link>
                <br />
                <Link
                  to="/home"
                  className="text-sm text-[var(--shop-text-secondary)] hover:text-[var(--shop-accent)] inline-flex items-center justify-center gap-2 min-h-[44px] transition-colors"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  {t('common.back')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
