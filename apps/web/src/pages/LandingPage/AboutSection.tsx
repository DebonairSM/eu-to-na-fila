import { cn } from '@/lib/utils';
import { Heading, Text, Section, Grid, Stack } from '@/components/design-system';
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
  const rightColumn = behavior.aboutRightColumn ?? 'image';

  const fallbackAbout = {
    sectionTitle: t('shop.aboutSectionTitleDefault'),
    imageUrl: DEFAULT_ABOUT_IMAGE,
    imageAlt: t('shop.aboutImageAltDefault'),
    features: [] as Array<{ icon: string; text: string }>,
  };
  const aboutData = homeContent?.about ?? fallbackAbout;
  const { sectionTitle, imageUrl, imageAlt } = aboutData;
  const features = aboutData.features ?? [];
  const imageFrameClass = imageFrameClassFor(behavior.aboutImageFrame);

  const fallbackLocation = {
    sectionTitle: t('management.locationSection'),
    labelAddress: t('management.address'),
    labelHours: t('management.hours'),
    labelPhone: t('management.phone'),
    labelLanguages: t('management.languages'),
    linkMaps: t('management.viewOnGoogleMaps'),
    address: '',
    addressLink: '#',
    hours: '',
    phone: '',
    phoneHref: '#',
    languages: '',
    mapQuery: '',
  };
  const loc = homeContent?.location ?? fallbackLocation;
  const accentClass = 'text-[var(--shop-accent,#D4AF37)] hover:underline';
  const locationItems = [
    { icon: 'location_on' as const, title: loc.labelAddress ?? t('management.address'), content: loc.address, link: loc.addressLink, linkLabel: loc.linkMaps ?? t('management.viewOnGoogleMaps') },
    { icon: 'schedule' as const, title: loc.labelHours ?? t('management.hours'), content: loc.hours },
    { icon: 'phone' as const, title: loc.labelPhone ?? t('management.phone'), content: loc.phone, href: loc.phoneHref },
    { icon: 'language' as const, title: loc.labelLanguages ?? t('management.languages'), content: loc.languages },
  ];
  // Map is rendered only in LocationSection to avoid duplicate maps per layout.

  const aboutContent = (
    <>
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
    </>
  );

  const locationBlock = (
    <Stack spacing="lg">
      {locationItems.map((item) => (
        <div key={item.title} className="location-info-card flex gap-4">
          <span className="location-info-card__icon material-symbols-outlined text-[var(--shop-accent,#D4AF37)] text-xl flex-shrink-0">
            {item.icon}
          </span>
          <div className="location-info-card__body min-w-0">
            <Heading level={4} className="location-info-card__title mb-1 text-lg font-semibold">
              {item.title}
            </Heading>
            <Text size="sm" variant="secondary" className="location-info-card__content">
              {'link' in item && item.link ? (
                <>
                  <span className="whitespace-pre-line">{item.content}</span>
                  <br />
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className={accentClass}>
                    {item.linkLabel}
                  </a>
                </>
              ) : 'href' in item && item.href ? (
                <a href={item.href} className={accentClass}>
                  {item.content}
                </a>
              ) : (
                <span className="whitespace-pre-line">{item.content}</span>
              )}
            </Text>
          </div>
        </div>
      ))}
    </Stack>
  );

  if (rightColumn === 'none') {
    const alignClass = behavior.sectionTitleAlign === 'left' ? 'text-left' : 'text-center';
    return (
      <Section id="about" variant="primary">
        <div className={cn('max-w-2xl mx-auto', alignClass)}>
          <div className="lg:hidden">{aboutContent}</div>
          <div className="hidden lg:block">{aboutContent}</div>
        </div>
      </Section>
    );
  }

  return (
    <Section id="about" variant="primary">
      <div className="lg:hidden space-y-8">
        <div>{aboutContent}</div>
        {rightColumn === 'image' && (
          <div className={cn('aspect-[4/5] border border-[rgba(255,255,255,0.08)]', imageFrameClass, 'rounded-xl')}>
            <img
              src={imageUrl}
              alt={imageAlt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
        {rightColumn === 'location' && <div className="mt-8">{locationBlock}</div>}
      </div>

      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-start">
        <div>{aboutContent}</div>
        {rightColumn === 'image' && (
          <div className={cn('aspect-[4/5] border border-[rgba(255,255,255,0.08)]', imageFrameClass, 'rounded-2xl')}>
            <img
              src={imageUrl}
              alt={imageAlt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
        {rightColumn === 'location' && locationBlock}
      </div>
    </Section>
  );
}
