import type { ShopConfig } from '@/contexts/ShopConfigContext';
import { ShopConfigContext, getPreviewScopedStyles } from '@/contexts/ShopConfigContext';
import { Heading, Section, SectionDivider } from '@/components/design-system';
import { HeroSection } from '@/pages/LandingPage/HeroSection';
import { AboutSection } from '@/pages/LandingPage/AboutSection';

const previewContextValue = { isLoading: false, error: null };

interface ShopPreviewProps {
  config: ShopConfig;
  className?: string;
}

/**
 * Renders a live preview of the shop landing page using the given config.
 * Links and navigation are disabled so the preview stays in place.
 */
export function ShopPreview({ config, className }: ShopPreviewProps) {
  const scopedStyles = getPreviewScopedStyles(config);

  const handlePreviewClick = (e: React.MouseEvent) => {
    const link = (e.target as HTMLElement).closest('a');
    if (link) e.preventDefault();
  };

  return (
    <div
      className={className}
      style={{
        ...scopedStyles,
        backgroundColor: 'var(--shop-background)',
      }}
      data-shop-preset={config.style.preset}
      data-shop-layout={config.style.layout}
    >
      <ShopConfigContext.Provider value={{ ...previewContextValue, config }}>
        <div
          className="min-h-[400px] overflow-y-auto rounded-lg border border-white/10"
          onClick={handlePreviewClick}
          onClickCapture={(e) => {
            const link = (e.target as HTMLElement).closest('a');
            if (link) e.preventDefault();
          }}
        >
          <p className="sticky top-0 z-10 bg-amber-500/90 text-center text-xs font-medium text-black py-1.5 px-2">
            Pré-visualização — links desativados
          </p>
          <div className="[&_.hero]:min-h-0 [&_.hero]:py-12 [&_.hero]:lg:py-16">
            <HeroSection />
          </div>
          <SectionDivider />
          <Section variant="secondary" className="py-8">
            <Heading level={2} className="section-title section-title--layout text-center">
              {config.homeContent?.services?.sectionTitle ?? 'Serviços'}
            </Heading>
            <p className="text-center text-sm text-[var(--shop-text-secondary)] mt-2">
              Lista de serviços aparece na página real.
            </p>
          </Section>
          <SectionDivider />
          <AboutSection />
          <SectionDivider />
          <Section variant="primary" className="py-8">
            <Heading level={2} className="section-title section-title--layout text-center">
              {config.homeContent?.location?.sectionTitle ?? 'Localização'}
            </Heading>
            <p className="text-center text-sm text-[var(--shop-text-secondary)] mt-2">
              Endereço e mapa aparecem na página real.
            </p>
          </Section>
        </div>
      </ShopConfigContext.Provider>
    </div>
  );
}
