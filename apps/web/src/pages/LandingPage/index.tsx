import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { SectionDivider } from '@/components/design-system';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { getLayoutBehavior } from '@/lib/layouts';
import { HeroSection } from './HeroSection';
import { ServicesSection } from './ServicesSection';
import { AboutSection } from './AboutSection';
import { LocationSection } from './LocationSection';

export function LandingPage() {
  const location = useLocation();
  const { config } = useShopConfig();
  const layout = config.style?.layout ?? 'centered';
  const behavior = getLayoutBehavior(layout);
  const aboutLast = behavior.sectionOrder === 'aboutLast';

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
