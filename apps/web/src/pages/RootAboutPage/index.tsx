import { Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';
import { RootSiteNav } from '@/components/RootSiteNav';
import { useLocale } from '@/contexts/LocaleContext';
import { LOGO_URL } from '@/lib/logo';

export function RootAboutPage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <RootSiteNav />

      <main className="py-20">
        <Container size="2xl">
        <header className="mb-16">
          <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">{t('root.aboutTitle')}</h1>
          <p className="text-xl text-gray-400 max-w-2xl leading-relaxed font-light">
            {t('root.aboutTagline')}
          </p>
        </header>

        <section className="mb-20">
          <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-12">
            <h2 className="text-3xl font-light mb-6">{t('root.whatWeDo')}</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p className="text-lg">
                {t('root.whatWeDoP1')}
              </p>
              <p className="text-lg">
                {t('root.whatWeDoP2')}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-3xl font-light mb-12">{t('root.pillars')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: t('root.pillar1Title'), description: t('root.pillar1Desc') },
              { title: t('root.pillar2Title'), description: t('root.pillar2Desc') },
              { title: t('root.pillar3Title'), description: t('root.pillar3Desc') },
              { title: t('root.pillar4Title'), description: t('root.pillar4Desc') },
              { title: t('root.pillar5Title'), description: t('root.pillar5Desc') },
              { title: t('root.pillar6Title'), description: t('root.pillar6Desc') },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-xl p-6 hover:border-white/20 hover:bg-white/10 transition-all"
              >
                <h3 className="text-lg font-medium mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <Link
            to="/contact"
            className="inline-block px-8 py-3.5 bg-white text-[#0a0a0a] font-medium rounded-lg hover:bg-gray-100 transition-all text-sm"
          >
            {t('root.contactCta')}
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
              <h3 className="font-medium mb-4 text-sm uppercase tracking-wider text-gray-400">{t('root.navigation')}</h3>
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
              </nav>
            </div>
            <div>
              <h3 className="font-medium mb-4 text-sm uppercase tracking-wider text-gray-400">{t('root.company')}</h3>
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
