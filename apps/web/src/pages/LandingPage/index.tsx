import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { SectionDivider } from '@/components/design-system';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getLayoutBehavior } from '@/lib/layouts';
import { HeroSection } from './HeroSection';
import { ServicesSection } from './ServicesSection';
import { AboutSection } from './AboutSection';
import { LocationSection } from './LocationSection';

const LEAVE_FAILED_KEY = 'eutonafila_leave_failed';

export function LandingPage() {
  const location = useLocation();
  const { t } = useLocale();
  const { config } = useShopConfig();
  const layout = config.style?.layout ?? 'centered';
  const behavior = getLayoutBehavior(layout);
  const aboutLast = behavior.sectionOrder === 'aboutLast';
  const [showLeaveFailed, setShowLeaveFailed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(LEAVE_FAILED_KEY)) {
        sessionStorage.removeItem(LEAVE_FAILED_KEY);
        setShowLeaveFailed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          const headerOffset = 100;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--shop-background, #0a0a0a)' }}>
      <Navigation />
      {showLeaveFailed && (
        <div
          className="px-4 py-3 text-center text-sm"
          style={{ backgroundColor: 'var(--shop-accent, #3b82f6)', color: 'fff' }}
          role="alert"
        >
          <span>{t('status.leaveFailedOnHome')}</span>
          <button
            type="button"
            onClick={() => setShowLeaveFailed(false)}
            className="ml-2 underline focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label={t('status.close')}
          >
            {t('status.close')}
          </button>
        </div>
      )}
      <HeroSection />
      <SectionDivider />
      <ServicesSection />
      <SectionDivider />
      {aboutLast ? (
        <>
          <LocationSection />
          <SectionDivider />
          <AboutSection />
        </>
      ) : (
        <>
          <AboutSection />
          <SectionDivider />
          <LocationSection />
        </>
      )}
    </div>
  );
}
