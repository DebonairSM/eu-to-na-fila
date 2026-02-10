import { useLocale } from '@/contexts/LocaleContext';
import { SUPPORTED_LOCALES } from '@/lib/constants';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t('nav.chooseLanguage')}>
      {SUPPORTED_LOCALES.map((loc) => {
        const label = t(`locale.${loc}`);
        const isActive = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            className="min-w-[44px] min-h-[44px] px-2 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-nav-bg,#0a0a0a)]"
            style={{
              color: isActive ? 'var(--shop-accent, #D4AF37)' : 'var(--shop-text-secondary, rgba(255,255,255,0.7))',
              backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}
            aria-pressed={isActive}
            aria-label={label}
          >
            {loc === 'pt-BR' ? 'PT' : loc === 'en' ? 'EN' : loc}
          </button>
        );
      })}
    </div>
  );
}
