import { Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';
import { RootSiteNav } from '@/components/RootSiteNav';
import { RootSiteFooter } from '@/components/RootSiteFooter';
import { useLocale } from '@/contexts/LocaleContext';

export function RootContactPage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <RootSiteNav />

      <main className="py-20">
        <Container size="2xl">
        <header className="mb-16 text-center">
          <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">{t('root.contactTitle')}</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
            {t('root.contactSubtitle')}
          </p>
        </header>

        <section className="mb-16">
          <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-12">
            <h2 className="text-3xl font-light mb-8">{t('root.contactSectionTitle')}</h2>
            <p className="text-lg text-gray-300 leading-relaxed mb-10">
              {t('root.contactBody')}
            </p>
            
            <div className="space-y-8">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-gray-300 text-xl">email</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">{t('root.emailLabel')}</h3>
                  <p className="text-gray-400 mb-1">{t('root.emailHint')}</p>
                  <p className="text-blue-400">eutonafila@gmail.com</p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-gray-300 text-xl">business</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-3">{t('root.servicesLabel')}</h3>
                  <div className="space-y-1.5 text-gray-400">
                    <p>{t('root.service1')}</p>
                    <p>{t('root.service2')}</p>
                    <p>{t('root.service3')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="text-center">
          <Link
            to="/projects"
            className="inline-block px-8 py-3.5 border border-white/20 text-white font-medium rounded-lg hover:border-white/40 hover:bg-white/5 transition-all text-sm"
          >
            {t('root.viewOurProjects')}
          </Link>
        </section>
        </Container>
      </main>

      <div className="mt-24">
        <RootSiteFooter />
      </div>
    </div>
  );
}
