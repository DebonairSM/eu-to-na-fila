import { cn } from '@/lib/utils';
import { Heading, Text, Section, Stack } from '@/components/design-system';
import { useShopConfig, useShopHomeContent } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getLayoutBehavior } from '@/lib/layouts';

export function LocationSection() {
  const { t } = useLocale();
  const { config } = useShopConfig();
  const homeContent = useShopHomeContent();
  const layout = config.style?.layout ?? 'centered';
  const behavior = getLayoutBehavior(layout);
  const compact = behavior.aboutRightColumn === 'location';

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
    {
      icon: 'location_on' as const,
      title: loc.labelAddress ?? t('management.address'),
      content: (
        <>
          <span className="whitespace-pre-line">{loc.address}</span>
          <br />
          <a href={loc.addressLink} target="_blank" rel="noopener noreferrer" className={accentClass}>
            {loc.linkMaps ?? t('management.viewOnGoogleMaps')}
          </a>
        </>
      ),
    },
    {
      icon: 'schedule' as const,
      title: loc.labelHours ?? t('management.hours'),
      content: <span className="whitespace-pre-line">{loc.hours}</span>,
    },
    {
      icon: 'phone' as const,
      title: loc.labelPhone ?? t('management.phone'),
      content: (
        <a href={loc.phoneHref} className={accentClass}>
          {loc.phone}
        </a>
      ),
    },
    {
      icon: 'language' as const,
      title: loc.labelLanguages ?? t('management.languages'),
      content: loc.languages,
    },
  ];

  const mapEmbedUrl = loc.mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(loc.mapQuery)}&output=embed`
    : null;

  if (compact && mapEmbedUrl) {
    return (
      <Section id="location" variant="secondary">
        <div className="text-center mb-8">
          <Heading level={2} className={cn('section-title', 'section-title--layout')}>{loc.sectionTitle}</Heading>
        </div>
        <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
          <iframe
            src={mapEmbedUrl}
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="grayscale hover:grayscale-0 transition-all w-full"
            title={`${t('shop.locationTitle')} ${config.name}`}
          />
        </div>
      </Section>
    );
  }

  if (compact) {
    return <Section id="location" variant="secondary" className="sr-only" aria-label={loc.sectionTitle} />;
  }

  return (
    <Section id="location" variant="secondary">
      <div className="text-center mb-12">
        <Heading level={2} className={cn('section-title', 'section-title--layout')}>{loc.sectionTitle}</Heading>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-start">
        <Stack spacing="lg">
          {locationItems.map((item) => (
            <div key={item.title} className="location-info-card flex gap-4 lg:gap-6">
              <span className="location-info-card__icon material-symbols-outlined text-[var(--shop-accent,#D4AF37)] text-xl lg:text-2xl flex-shrink-0">
                {item.icon}
              </span>
              <div className="location-info-card__body min-w-0">
                <Heading level={4} className="location-info-card__title mb-1 lg:mb-2 text-lg font-semibold">
                  {item.title}
                </Heading>
                <Text size="sm" className="lg:!text-base location-info-card__content" variant="secondary">
                  {item.content}
                </Text>
              </div>
            </div>
          ))}
        </Stack>
        {mapEmbedUrl && (
          <div className="rounded-xl lg:rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="400"
              style={{ border: 0 }}
              className="grayscale hover:grayscale-0 transition-all w-full"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`${t('shop.locationTitle')} ${config.name}`}
            />
          </div>
        )}
      </div>
    </Section>
  );
}
