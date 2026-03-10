import { Link } from 'react-router-dom';
import { useLoginForm } from './hooks/useLoginForm';
import { useLocale } from '@/contexts/LocaleContext';

export function LoginForm() {
  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    error,
    handleSubmit,
    goToGoogleAuth,
  } = useLoginForm();
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-4xl text-[var(--shop-text-on-accent)]">
            lock
          </span>
        </div>
        <h2 className="text-lg font-semibold text-[var(--shop-text-primary)]">
          {t('auth.unifiedLoginTitle')}
        </h2>
        <p className="text-sm text-[var(--shop-text-secondary)]">
          {t('auth.unifiedLoginHint')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder=" "
            autoComplete="username email"
            className="w-full px-4 py-4 pt-6 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base placeholder:text-[var(--shop-text-secondary)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)]"
          />
          <label
            htmlFor="identifier"
            className={`absolute left-4 text-sm text-[var(--shop-text-secondary)] pointer-events-none transition-all ${
              identifier ? 'top-2 text-xs text-[var(--shop-accent)]' : 'top-4'
            }`}
          >
            {t('auth.emailOrUsername')}
          </label>
        </div>

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
            {t('auth.password')}
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

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-accent)] focus:ring-[var(--shop-accent)]"
            aria-label={t('auth.rememberMe')}
          />
          <span className="text-sm text-[var(--shop-text-secondary)]">{t('auth.rememberMe')}</span>
        </label>

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
            <span className="material-symbols-outlined text-xl">login</span>
          )}
        </button>

        <p className="text-center text-sm text-[var(--shop-text-secondary)]">
          <Link to="/shop/forgot-password" className="text-[var(--shop-accent)] hover:underline">
            {t('auth.forgotPassword')}
          </Link>
        </p>

        <button
          type="button"
          onClick={goToGoogleAuth}
          className="w-full px-6 py-3 min-h-[44px] border border-[var(--shop-border-color)] rounded-lg flex items-center justify-center gap-2 text-[var(--shop-text-primary)] text-sm font-medium hover:bg-[rgba(255,255,255,0.05)] transition-all"
        >
          {t('auth.signInOrCreateWithGoogle')}
        </button>
        <p className="text-center text-sm text-[var(--shop-text-secondary)]">
          <Link to="/shop/signup" className="text-[var(--shop-accent)] hover:underline">
            {t('auth.createAccount')}
          </Link>
        </p>
      </form>

      <div className="text-center pt-3 border-t border-[var(--shop-border-color)]">
        <Link to="/home" className="text-xs text-[var(--shop-accent)] hover:underline">
          {t('common.back')}
        </Link>
      </div>
    </div>
  );
}
