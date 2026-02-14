import { Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';
import { RootSiteNav } from '@/components/RootSiteNav';
import { useLocale } from '@/contexts/LocaleContext';
import { LOGO_URL } from '@/lib/logo';

export function PropagandasPage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <RootSiteNav />

      <main className="py-20">
        <Container size="2xl">
          <header className="mb-16 text-center">
            <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">
              {t('root.propagandasTitle')}
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
              {t('root.propagandasSubtitle')}
            </p>
          </header>

          <section className="mb-16">
            <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-12">
              <h2 className="text-2xl font-light mb-6">Demographic</h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                {t('root.propagandasDemographic')}
              </p>
            </div>
          </section>

          <section className="mb-16">
            <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-12">
              <h2 className="text-2xl font-light mb-6">How it works</h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                {t('root.propagandasHowItWorks')}
              </p>
            </div>
          </section>

          <section className="text-center">
            <Link
              to="/propagandas/buy"
              className="inline-block px-8 py-3.5 bg-white text-[#0a0a0a] font-medium rounded-lg hover:bg-gray-100 transition-all text-sm"
            >
              {t('root.propagandasCta')}
            </Link>
          </section>
        </Container>
      </main>

      <footer className="border-t border-white/5 bg-black py-16 mt-24">
        <Container size="2xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={LOGO_URL}
                  alt="EuTô NaFila"
                  className="h-24 w-auto object-contain shrink-0"
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
    </div>
  );
}
