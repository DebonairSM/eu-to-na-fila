import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getErrorMessage } from '@/lib/utils';

export function ForgotPasswordPage() {
  const shopSlug = useShopSlug();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setIsLoading(true);
    try {
      await api.requestPasswordReset(shopSlug, email.trim());
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, t('auth.loginError')));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--shop-background)]">
      <Navigation />
      <div className="flex items-center justify-center min-h-screen px-4 sm:px-6 py-20">
        <div className="w-full max-w-md min-w-[320px]">
          <div className="bg-[color-mix(in_srgb,var(--shop-surface-secondary)_95%,transparent)] backdrop-blur-sm border border-[var(--shop-border-color)] rounded-2xl p-6 sm:p-8 shadow-2xl">
            {sent ? (
              <div className="space-y-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-[var(--shop-text-on-accent)]">mail</span>
                </div>
                <h2 className="text-lg font-semibold text-[var(--shop-text-primary)]">
                  {t('auth.forgotPasswordSuccessTitle')}
                </h2>
                <p className="text-sm text-[var(--shop-text-secondary)]">
                  {t('auth.forgotPasswordSuccessHint')}
                </p>
                <Link
                  to="/shop/login"
                  className="inline-block w-full px-6 py-3 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-semibold rounded-lg hover:opacity-90 transition-opacity text-center"
                >
                  {t('auth.backToLogin')}
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center space-y-4 mb-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-[var(--shop-text-on-accent)]">lock_reset</span>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--shop-text-primary)]">
                    {t('auth.forgotPasswordTitle')}
                  </h2>
                  <p className="text-sm text-[var(--shop-text-secondary)]">
                    {t('auth.forgotPasswordHint')}
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder=" "
                      autoComplete="email"
                      required
                      className="w-full px-4 py-4 pt-6 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base placeholder:text-[var(--shop-text-secondary)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)]"
                    />
                    <label
                      htmlFor="email"
                      className={`absolute left-4 text-sm text-[var(--shop-text-secondary)] pointer-events-none transition-all ${
                        email ? 'top-2 text-xs text-[var(--shop-accent)]' : 'top-4'
                      }`}
                    >
                      {t('auth.email')}
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
                        {t('auth.sending')}
                      </>
                    ) : (
                      t('auth.sendResetLink')
                    )}
                  </button>
                </form>
                <p className="text-center text-sm text-[var(--shop-text-secondary)] mt-5">
                  <Link to="/shop/login" className="text-[var(--shop-accent)] hover:underline">
                    {t('auth.backToLogin')}
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
