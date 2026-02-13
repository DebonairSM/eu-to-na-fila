import { Link } from 'react-router-dom';
import { useSignupForm } from './hooks/useSignupForm';
import { useLocale } from '@/contexts/LocaleContext';

export function SignupForm() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    name,
    setName,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    handleSubmit,
    goToGoogleAuth,
  } = useSignupForm();
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-4xl text-[var(--shop-text-on-accent)]">
            person_add
          </span>
        </div>
        <h2 className="text-lg font-semibold text-[var(--shop-text-primary)]">
          {t('auth.signupTitle')}
        </h2>
        <p className="text-sm text-[var(--shop-text-secondary)]">
          {t('auth.signupHint')}
        </p>
      </div>

      <button
        type="button"
        onClick={goToGoogleAuth}
        className="w-full px-6 py-3 min-h-[44px] border border-[var(--shop-border-color)] rounded-lg flex items-center justify-center gap-2 text-[var(--shop-text-primary)] text-sm font-medium hover:bg-[rgba(255,255,255,0.05)] transition-all"
      >
        {t('auth.createAccountWithGoogle')}
      </button>

      <p className="text-center text-xs text-[var(--shop-text-secondary)]">
        {t('auth.orUseEmail')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=" "
            autoComplete="email"
            required
            className="w-full px-4 py-4 pt-6 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base placeholder:text-[var(--shop-text-secondary)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)]"
          />
          <label
            htmlFor="signup-email"
            className={`absolute left-4 text-sm text-[var(--shop-text-secondary)] pointer-events-none transition-all ${
              email ? 'top-2 text-xs text-[var(--shop-accent)]' : 'top-4'
            }`}
          >
            {t('auth.email')}
          </label>
        </div>

        <div className="relative">
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder=" "
            autoComplete="name"
            className="w-full px-4 py-4 pt-6 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base placeholder:text-[var(--shop-text-secondary)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)]"
          />
          <label
            htmlFor="signup-name"
            className={`absolute left-4 text-sm text-[var(--shop-text-secondary)] pointer-events-none transition-all ${
              name ? 'top-2 text-xs text-[var(--shop-accent)]' : 'top-4'
            }`}
          >
            {t('auth.nameOptional')}
          </label>
        </div>

        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full px-4 py-4 pt-6 pr-12 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base placeholder:text-[var(--shop-text-secondary)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)]"
          />
          <label
            htmlFor="signup-password"
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

        <div className="relative">
          <input
            id="signup-confirm"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder=" "
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full px-4 py-4 pt-6 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)] text-base placeholder:text-[var(--shop-text-secondary)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:border-[var(--shop-accent)]"
          />
          <label
            htmlFor="signup-confirm"
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
          className="w-full px-6 py-4 min-h-[52px] bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-semibold rounded-lg flex items-center justify-center gap-3 hover:bg-[var(--shop-accent-hover)] transition-all disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
              {t('auth.creatingAccount')}
            </>
          ) : (
            t('auth.createAccount')
          )}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--shop-text-secondary)] pt-2 border-t border-[var(--shop-border-color)]">
        <Link to="/shop/login" className="text-[var(--shop-accent)] hover:underline">
          {t('auth.alreadyHaveAccount')}
        </Link>
      </p>
    </div>
  );
}
