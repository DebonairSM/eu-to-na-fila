import { cn } from '@/lib/utils';
import { Heading, Text, Section, Stack } from '@/components/design-system';
import { useShopConfig } from '@/contexts/ShopConfigContext';

const fallbackLocation = {
  sectionTitle: 'Localização',
  labelAddress: 'Endereço',
  labelHours: 'Horário de Funcionamento',
  labelPhone: 'Telefone',
  labelLanguages: 'Idiomas',
  linkMaps: 'Ver no Google Maps',
  address: '',
  addressLink: '#',
  hours: '',
  phone: '',
  phoneHref: '#',
  languages: '',
  mapQuery: '',
};

export function LocationSection() {
  const { config } = useShopConfig();
  const loc = config.homeContent?.location ?? fallbackLocation;
  const accentClass = 'text-[var(--shop-accent,#D4AF37)] hover:underline';

  const locationItems = [
    {
      icon: 'location_on' as const,
      title: loc.labelAddress ?? 'Endereço',
      content: (
        <>
          <span className="whitespace-pre-line">{loc.address}</span>
          <br />
          <a href={loc.addressLink} target="_blank" rel="noopener noreferrer" className={accentClass}>
            {loc.linkMaps ?? 'Ver no Google Maps'}
          </a>
        </>
      ),
    },
    {
      icon: 'schedule' as const,
      title: loc.labelHours ?? 'Horário de Funcionamento',
      content: <span className="whitespace-pre-line">{loc.hours}</span>,
    },
    {
      icon: 'phone' as const,
      title: loc.labelPhone ?? 'Telefone',
      content: (
        <a href={loc.phoneHref} className={accentClass}>
          {loc.phone}
        </a>
      ),
    },
    {
      icon: 'language' as const,
      title: loc.labelLanguages ?? 'Idiomas',
      content: loc.languages,
    },
  ];

  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(loc.mapQuery)}&output=embed`;

  return (
    <Section id="location" variant="secondary">
      <div className="text-center mb-12">
        <Heading level={2} className={cn('section-title', 'section-title--preset')}>{loc.sectionTitle}</Heading>
      </div>

      <div className="lg:hidden space-y-6">
        <Stack spacing="lg">
          {locationItems.map((item) => (
            <div key={item.title} className="flex gap-4">
              <span className="material-symbols-outlined text-[var(--shop-accent,#D4AF37)] text-xl flex-shrink-0">
                {item.icon}
              </span>
              <div>
                <Heading level={4} className="mb-1 text-lg font-semibold">
                  {item.title}
                </Heading>
                <Text size="sm" variant="secondary">
                  {item.content}
                </Text>
              </div>
            </div>
          ))}
        </Stack>

        <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
          <iframe
            src={mapEmbedUrl}
            width="100%"
            height="300"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="grayscale hover:grayscale-0 transition-all"
            title={`Localização ${config.name}`}
          />
        </div>
      </div>

      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-start">
        <Stack spacing="xl">
          {locationItems.map((item) => (
            <div key={item.title} className="flex gap-6">
              <span className="material-symbols-outlined text-[var(--shop-accent,#D4AF37)] text-2xl flex-shrink-0">
                {item.icon}
              </span>
              <div>
                <Heading level={4} className="mb-2 text-lg font-semibold">
                  {item.title}
                </Heading>
                <Text size="base" variant="secondary">
                  {item.content}
                </Text>
              </div>
            </div>
          ))}
        </Stack>
        <div className="rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
          <iframe
            src={mapEmbedUrl}
            width="100%"
            height="500"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="grayscale hover:grayscale-0 transition-all"
            title={`Localização ${config.name}`}
          />
        </div>
      </div>
    </Section>
  );
}
