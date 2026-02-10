import { cn } from '@/lib/utils';
import { Heading, Text, Section, Grid } from '@/components/design-system';
import { useShopConfig } from '@/contexts/ShopConfigContext';

const fallbackAbout = { sectionTitle: 'Sobre', imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=1000&fit=crop&q=80', imageAlt: 'Interior da barbearia', features: [] as Array<{ icon: string; text: string }> };

export function AboutSection() {
  const { config } = useShopConfig();
  const { style } = config;
  const preset = style?.preset ?? 'modern';
  const { sectionTitle, imageUrl, imageAlt, features } = config.homeContent?.about ?? fallbackAbout;
  const imageFrameClass = cn(
    'overflow-hidden',
    preset === 'classical' && 'rounded-lg border-2 border-[var(--shop-border-color)]',
    preset === 'vintage' && 'rounded border-[length:var(--shop-border-width,2px)] border-double border-[var(--shop-border-color)]',
    preset === 'luxury' && 'rounded-2xl shadow-xl',
    preset === 'industrial' && 'rounded-none border-2 border-[var(--shop-border-color)]'
  );

  return (
    <Section id="about" variant="primary">
      <div className="lg:hidden space-y-8">
        <div>
          <Heading level={2} className={cn('section-title', 'section-title--preset', 'mb-6')}>
            {sectionTitle}
          </Heading>
          <Grid cols={{ mobile: 2 }} gap="md" className="mb-8">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--shop-accent,#D4AF37)] text-xl">
                  {feature.icon}
                </span>
                <Text size="sm" variant="secondary">
                  {feature.text}
                </Text>
              </div>
            ))}
          </Grid>
        </div>
        <div className={cn('aspect-[4/5] border border-[rgba(255,255,255,0.08)]', imageFrameClass, 'rounded-xl')}>
          <img
            src={imageUrl}
            alt={imageAlt}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
        <div>
          <Heading level={2} className={cn('section-title', 'section-title--preset', 'mb-6')}>
            {sectionTitle}
          </Heading>
          <Grid cols={{ mobile: 2 }} gap="lg">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[var(--shop-accent,#D4AF37)] text-2xl">
                  {feature.icon}
                </span>
                <Text size="base" variant="secondary">
                  {feature.text}
                </Text>
              </div>
            ))}
          </Grid>
        </div>
        <div className={cn('aspect-[4/5] border border-[rgba(255,255,255,0.08)]', imageFrameClass, 'rounded-2xl')}>
          <img
            src={imageUrl}
            alt={imageAlt}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </Section>
  );
}
