import { useLocale } from '@/contexts/LocaleContext';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t('nav.chooseLanguage')}>
      <button
        type="button"
        onClick={() => setLocale('pt-BR')}
        className="min-w-[44px] min-h-[44px] px-2 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-nav-bg,#0a0a0a)]"
        style={{
          color: locale === 'pt-BR' ? 'var(--shop-accent, #D4AF37)' : 'var(--shop-text-secondary, rgba(255,255,255,0.7))',
          backgroundColor: locale === 'pt-BR' ? 'rgba(255,255,255,0.08)' : 'transparent',
        }}
        aria-pressed={locale === 'pt-BR'}
        aria-label="Português"
      >
        PT
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className="min-w-[44px] min-h-[44px] px-2 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-nav-bg,#0a0a0a)]"
        style={{
          color: locale === 'en' ? 'var(--shop-accent, #D4AF37)' : 'var(--shop-text-secondary, rgba(255,255,255,0.7))',
          backgroundColor: locale === 'en' ? 'rgba(255,255,255,0.08)' : 'transparent',
        }}
        aria-pressed={locale === 'en'}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
