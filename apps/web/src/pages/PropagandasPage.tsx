import { Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';
import { RootSiteNav } from '@/components/RootSiteNav';
import { RootSiteFooter } from '@/components/RootSiteFooter';
import { useLocale } from '@/contexts/LocaleContext';

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

          <p className="text-center text-gray-500 text-sm mb-16 max-w-xl mx-auto">
            {t('root.propagandasSpecs')}
          </p>

          <section className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center">
                <span className="inline-flex w-10 h-10 rounded-full bg-white/10 text-white font-medium mb-3 items-center justify-center">1</span>
                <h3 className="text-lg font-medium mb-2">{t('root.propagandasStep1')}</h3>
              </div>
              <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center">
                <span className="inline-flex w-10 h-10 rounded-full bg-white/10 text-white font-medium mb-3 items-center justify-center">2</span>
                <h3 className="text-lg font-medium mb-2">{t('root.propagandasStep2')}</h3>
              </div>
              <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center">
                <span className="inline-flex w-10 h-10 rounded-full bg-white/10 text-white font-medium mb-3 items-center justify-center">3</span>
                <h3 className="text-lg font-medium mb-2">{t('root.propagandasStep3')}</h3>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-12">
              <h2 className="text-2xl font-light mb-6">{t('root.propagandasSectionDemographic')}</h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                {t('root.propagandasDemographic')}
              </p>
            </div>
          </section>

          <section className="mb-16">
            <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-12">
              <h2 className="text-2xl font-light mb-6">{t('root.propagandasSectionHowItWorks')}</h2>
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

      <div className="mt-24">
        <RootSiteFooter />
      </div>
    </div>
  );
}
