import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getErrorMessage } from '@/lib/utils';

export function ResetPasswordPage() {
  const shopSlug = useShopSlug();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token.trim()) {
      setError(t('auth.resetPasswordInvalidLink'));
    }
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) return;
    if (password !== confirmPassword) {
      setError(t('auth.resetPasswordMismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.resetPasswordTooShort'));
      return;
    }
    setIsLoading(true);
    try {
      await api.resetPassword(shopSlug, { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/shop/login', { replace: true, state: { message: t('auth.resetPasswordSuccessMessage') } });
      }, 2000);
    } catch (err) {
      setError(getErrorMessage(err, t('auth.resetPasswordError')));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--shop-background)]">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md text-center">
            <div className="bg-[color-mix(in_srgb,var(--shop-surface-secondary)_95%,transparent)] backdrop-blur-sm border border-[var(--shop-border-color)] rounded-2xl p-8 shadow-2xl">
              <div className="w-20 h-20 mx-auto rounded-full bg-[var(--shop-accent)] flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-[var(--shop-text-on-accent)]">check</span>
              </div>
              <h2 className="text-lg font-semibold text-[var(--shop-text-primary)] mb-2">
                {t('auth.resetPasswordDone')}
              </h2>
              <p className="text-sm text-[var(--shop-text-secondary)]">{t('auth.redirectingToLogin')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--shop-background)]">
      <Navigation />
      <div className="flex items-center justify-center min-h-screen px-4 sm:px-6 py-20">
        <div className="w-full max-w-md min-w-[320px]">
          <div className="bg-[color-mix(in_srgb,var(--shop-surface-secondary)_95%,transparent)] backdrop-blur-sm border border-[var(--shop-border-color)] rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center space-y-4 mb-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-[var(--shop-text-on-accent)]">lock</span>
              </div>
              <h2 className="text-lg font-semibold text-[var(--shop-text-primary)]">
                {t('auth.resetPasswordTitle')}
              </h2>
              <p className="text-sm text-[var(--shop-text-secondary)]">
                {t('auth.resetPasswordHint')}
              </p>
            </div>
            {!token.trim() ? (
              <div className="space-y-4">
                <p className="text-sm text-[var(--shop-text-secondary)]">{t('auth.resetPasswordInvalidLink')}</p>
                <Link
                  to="/shop/forgot-password"
                  className="block w-full px-6 py-3 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-semibold rounded-lg hover:opacity-90 transition-opacity text-center"
                >
                  {t('auth.requestNewLink')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" "
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="w-full px-4 py-4 pt-6 pr-12 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)]"
                  />
                  <label
                    htmlFor="password"
                    className={`absolute left-4 text-sm text-[var(--shop-text-secondary)] pointer-events-none transition-all ${
                      password ? 'top-2 text-xs text-[var(--shop-accent)]' : 'top-4'
                    }`}
                  >
                    {t('auth.newPassword')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)] p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder=" "
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="w-full px-4 py-4 pt-6 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)]"
                  />
                  <label
                    htmlFor="confirmPassword"
                    className={`absolute left-4 text-sm text-[var(--shop-text-secondary)] pointer-events-none transition-all ${
                      confirmPassword ? 'top-2 text-xs text-[var(--shop-accent)]' : 'top-4'
                    }`}
                  >
                    {t('auth.confirmPassword')}
                  </label>
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
                  className="w-full px-6 py-4 min-h-[52px] bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-semibold rounded-lg flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
                      {t('auth.updating')}
                    </>
                  ) : (
                    t('auth.resetPasswordSubmit')
                  )}
                </button>
              </form>
            )}
            <p className="text-center text-sm text-[var(--shop-text-secondary)] mt-5">
              <Link to="/shop/login" className="text-[var(--shop-accent)] hover:underline">
                {t('auth.backToLogin')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
