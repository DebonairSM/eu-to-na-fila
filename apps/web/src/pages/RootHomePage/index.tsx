import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';
import { useLocale } from '@/contexts/LocaleContext';
import { LOGO_URL } from '@/lib/logo';

function Nav() {
  const { t } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks = [
    { to: '/projects', label: t('root.projects') },
    { to: '/about', label: t('root.about') },
    { to: '/contact', label: t('root.contact') },
  ];
  return (
    <nav className="border-b border-white/5 bg-[#0a0a0a] sticky top-0 z-50">
      <Container size="2xl">
        <div className="flex items-center justify-between py-2 sm:py-2.5">
          <Link to="/" className="flex items-center gap-3 group leading-none">
            <img
              src={LOGO_URL}
              alt="EuTô NaFila"
              className="h-8 sm:h-10 w-auto object-contain shrink-0"
            />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <button
            className="md:hidden p-2 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t('nav.menu')}
            aria-expanded={mobileOpen}
          >
            <span className="material-symbols-outlined text-xl">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-white/5 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm text-gray-400 hover:text-white font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </Container>
    </nav>
  );
}

function Footer() {
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
  );
}

export function RootHomePage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav />

      <main>
        {/* 1. Hero: Virtual Line for Barbershops */}
        <section className="relative min-h-[92vh] flex items-start sm:items-center justify-center px-6 pt-10 pb-20 sm:py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
          <div className="relative max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-medium uppercase tracking-wider">
              {t('root.heroBadge')}
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-light leading-[1.1] tracking-tight">
              {t('root.heroTitle')}
              <br />
              <span className="text-blue-400">{t('root.heroTitleHighlight')}</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
              {t('root.heroSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link
                to="/contact"
                className="px-8 py-3.5 bg-white text-[#0a0a0a] font-medium rounded-lg hover:bg-gray-100 transition-all text-sm"
              >
                {t('root.talkToUs')}
              </Link>
              <Link
                to="/projects"
                className="px-8 py-3.5 border border-white/20 text-white font-medium rounded-lg hover:border-white/40 hover:bg-white/5 transition-all text-sm"
              >
                {t('root.viewProject')}
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Problem: Chaos, crowding, lost customers */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-light mb-4 tracking-tight">
                {t('root.problemTitle')}
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                {t('root.problemDesc')}
              </p>
            </div>
          </Container>
        </section>

        {/* 3. Solution: Live virtual queue */}
        <section className="py-16 sm:py-24 bg-white/[0.02] border-t border-white/5">
          <Container size="2xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-light mb-4 tracking-tight">
                {t('root.solutionTitle')}
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                {t('root.solutionDesc')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { icon: 'schedule', title: t('root.solutionItem1Title'), desc: t('root.solutionItem1Desc') },
                { icon: 'notifications', title: t('root.solutionItem2Title'), desc: t('root.solutionItem2Desc') },
                { icon: 'group_off', title: t('root.solutionItem3Title'), desc: t('root.solutionItem3Desc') },
              ].map((item) => (
                <div
                  key={item.icon}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 hover:bg-white/[0.07] transition-all"
                >
                  <span className="material-symbols-outlined text-blue-400/80 text-3xl mb-4 block">
                    {item.icon}
                  </span>
                  <h3 className="text-lg font-medium mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* 4. How it works: Join, wait, return */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-light mb-4 tracking-tight">
                {t('root.howItWorksTitle')}
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                {t('root.howItWorksDesc')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto">
              {[
                { step: '1', title: t('root.howStep1Title'), desc: t('root.howStep1Desc') },
                { step: '2', title: t('root.howStep2Title'), desc: t('root.howStep2Desc') },
                { step: '3', title: t('root.howStep3Title'), desc: t('root.howStep3Desc') },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl font-semibold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-medium mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* 5. Owner benefits: Control + analytics */}
        <section className="py-16 sm:py-24 bg-white/[0.02] border-t border-white/5">
          <Container size="2xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-light mb-4 tracking-tight">
                {t('root.ownerTitle')}
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                {t('root.ownerDesc')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 hover:border-white/20 transition-all">
                <span className="material-symbols-outlined text-blue-400/80 text-3xl mb-4 block">
                  analytics
                </span>
                <h3 className="text-xl font-medium mb-3">{t('root.ownerFlowTitle')}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t('root.ownerFlowDesc')}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 hover:border-white/20 transition-all">
                <span className="material-symbols-outlined text-blue-400/80 text-3xl mb-4 block">
                  bar_chart
                </span>
                <h3 className="text-xl font-medium mb-3">{t('root.ownerPanelTitle')}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t('root.ownerPanelDesc')}
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* 6. AI insights */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-light mb-4 tracking-tight">
                {t('root.aiTitle')}
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                {t('root.aiDesc')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 sm:p-10 max-w-3xl mx-auto">
              <ul className="space-y-4 text-gray-300 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400/80 shrink-0 mt-0.5">lightbulb</span>
                  <span>{t('root.aiHint1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400/80 shrink-0 mt-0.5">lightbulb</span>
                  <span>{t('root.aiHint2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400/80 shrink-0 mt-0.5">lightbulb</span>
                  <span>{t('root.aiHint3')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400/80 shrink-0 mt-0.5">lightbulb</span>
                  <span>{t('root.aiHint4')}</span>
                </li>
              </ul>
              <p className="mt-6 text-gray-500 text-sm">
                {t('root.aiTagline')}
              </p>
            </div>
          </Container>
        </section>

        {/* 7. Bonus: Free custom barbershop website */}
        <section className="py-16 sm:py-24 bg-white/[0.02] border-t border-white/5">
          <Container size="2xl">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-8 sm:p-12 max-w-3xl mx-auto text-center">
              <span className="material-symbols-outlined text-blue-400 text-4xl mb-4 block">
                public
              </span>
              <h2 className="text-2xl sm:text-3xl font-medium mb-4">
                {t('root.showcaseTitle')}
              </h2>
              <p className="text-gray-400 mb-6 max-w-xl mx-auto">
                {t('root.showcaseDesc')}
              </p>
              <p className="text-gray-500 text-sm">
                {t('root.showcaseTagline')}
              </p>
            </div>
          </Container>
        </section>

        {/* 8. Target: Barbershops only */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-light mb-4 tracking-tight">
                {t('root.madeForTitle')}
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                {t('root.madeForDesc')}
              </p>
              <p className="text-blue-400/90 font-medium">
                {t('root.madeForCta')}
              </p>
            </div>
          </Container>
        </section>

        {/* 9. CTA */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 sm:p-12 max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-medium mb-4">
                {t('root.ctaTitle')}
              </h2>
              <p className="text-gray-400 mb-8">
                {t('root.ctaDesc')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/contact"
                  className="px-8 py-3.5 bg-white text-[#0a0a0a] font-medium rounded-lg hover:bg-gray-100 transition-all text-sm"
                >
                  {t('root.talkToUs')}
                </Link>
                <Link
                  to="/projects"
                  className="px-8 py-3.5 border border-white/20 text-white font-medium rounded-lg hover:border-white/40 hover:bg-white/5 transition-all text-sm"
                >
                  {t('root.viewLiveProject')}
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
}
