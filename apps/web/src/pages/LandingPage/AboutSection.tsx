import { cn } from '@/lib/utils';
import { Heading, Text, Section, Grid } from '@/components/design-system';
import { useShopConfig, useShopHomeContent } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getLayoutBehavior } from '@/lib/layouts';

const DEFAULT_ABOUT_IMAGE = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=1000&fit=crop&q=80';

function imageFrameClassFor(frame: 'none' | 'border' | 'double' | 'shadow' | 'sharp'): string {
  const base = 'overflow-hidden';
  switch (frame) {
    case 'border':
      return cn(base, 'rounded-lg border-2 border-[var(--shop-border-color)]');
    case 'double':
      return cn(base, 'rounded border-[length:var(--shop-border-width,2px)] border-double border-[var(--shop-border-color)]');
    case 'shadow':
      return cn(base, 'rounded-2xl shadow-xl');
    case 'sharp':
      return cn(base, 'rounded-none border-2 border-[var(--shop-border-color)]');
    default:
      return base;
  }
}

export function AboutSection() {
  const { t } = useLocale();
  const { config } = useShopConfig();
  const homeContent = useShopHomeContent();
  const { style } = config;
  const layout = style?.layout ?? 'centered';
  const behavior = getLayoutBehavior(layout);
  const fallbackAbout = {
    sectionTitle: t('shop.aboutSectionTitleDefault'),
    imageUrl: DEFAULT_ABOUT_IMAGE,
    imageAlt: t('shop.aboutImageAltDefault'),
    features: [] as Array<{ icon: string; text: string }>,
  };
  const { sectionTitle, imageUrl, imageAlt, features } = homeContent?.about ?? fallbackAbout;
  const imageFrameClass = imageFrameClassFor(behavior.aboutImageFrame);

  return (
    <Section id="about" variant="primary">
      <div className="lg:hidden space-y-8">
        <div>
          <Heading level={2} className={cn('section-title', 'section-title--layout', 'mb-6')}>
            {sectionTitle}
          </Heading>
          <Grid cols={{ mobile: 2 }} gap="md" className="mb-8">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--shop-accent,#D4AF37)] text-xl" style={{ fontWeight: style?.iconWeight ?? 300 }}>
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
          <Heading level={2} className={cn('section-title', 'section-title--layout', 'mb-6')}>
            {sectionTitle}
          </Heading>
          <Grid cols={{ mobile: 2 }} gap="lg">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[var(--shop-accent,#D4AF37)] text-2xl" style={{ fontWeight: style?.iconWeight ?? 300 }}>
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
