import { Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';
import { useLocale } from '@/contexts/LocaleContext';
import { LOGO_URL } from '@/lib/logo';

export function RootSiteFooter() {
  const { t } = useLocale();
  return (
    <footer className="border-t border-white/5 bg-black py-16">
      <Container size="2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={LOGO_URL}
                alt="EuTô NaFila"
                className="h-16 sm:h-20 w-auto object-contain shrink-0"
              />
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
              {t('root.footerTagline')}
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-4 text-sm uppercase tracking-wider text-gray-400">
              {t('root.navigation')}
            </h3>
            <nav className="space-y-3">
              <Link to="/" className="block text-gray-500 hover:text-white text-sm transition-colors">
                {t('root.home')}
              </Link>
              <Link to="/projects" className="block text-gray-500 hover:text-white text-sm transition-colors">
                {t('root.projects')}
              </Link>
              <Link to="/about" className="block text-gray-500 hover:text-white text-sm transition-colors">
                {t('root.about')}
              </Link>
              <Link to="/contact" className="block text-gray-500 hover:text-white text-sm transition-colors">
                {t('root.contact')}
              </Link>
              <Link to="/propagandas" className="block text-gray-500 hover:text-white text-sm transition-colors">
                {t('root.propagandas')}
              </Link>
            </nav>
          </div>
          <div>
            <h3 className="font-medium mb-4 text-sm uppercase tracking-wider text-gray-400">
              {t('root.company')}
            </h3>
            <p className="text-gray-500 text-sm">{t('root.madeFor')}</p>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 text-center text-gray-600 text-sm">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <p>&copy; {new Date().getFullYear()} EuToNaFila. {t('root.copyright')}.</p>
            <Link
              to="/company/login"
              className="text-gray-500/60 hover:text-gray-400 transition-colors text-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">lock</span>
              {t('root.admin')}
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
