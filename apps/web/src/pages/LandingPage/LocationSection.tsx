import { Heading, Text, Section, Stack } from '@/components/design-system';

const locationInfo = [
  {
    icon: 'location_on',
    title: 'Endereço',
    content: (
      <>
        R. João M Silvano, 281 - Morro Grande
        <br />
        Sangão - SC, 88717-000
        <br />
        <a
          href="https://www.google.com/maps/search/?api=1&query=R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#D4AF37] hover:underline"
        >
          Ver no Google Maps
        </a>
      </>
    ),
  },
  {
    icon: 'schedule',
    title: 'Horário de Funcionamento',
    content: (
      <>
        Segunda a Sábado: 9:00 - 19:00
        <br />
        Domingo: Fechado
      </>
    ),
  },
  {
    icon: 'phone',
    title: 'Telefone',
    content: (
      <a href="tel:+5548998354097" className="text-[#D4AF37] hover:underline">
        (48) 99835-4097
      </a>
    ),
  },
  {
    icon: 'language',
    title: 'Idiomas',
    content: 'Português & English',
  },
];

export function LocationSection() {
  return (
    <Section id="location" variant="secondary">
      <div className="text-center mb-16">
        <Heading level={2}>Localização</Heading>
      </div>

      <div className="lg:hidden space-y-6">
        <Stack spacing="lg">
          {locationInfo.map((item) => (
            <div key={item.title} className="flex gap-4">
              <span className="material-symbols-outlined text-[#D4AF37] text-2xl flex-shrink-0">
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

        <div className="rounded-xl overflow-hidden border border-[rgba(212,175,55,0.2)]">
          <iframe
            src="https://www.google.com/maps?q=R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000&output=embed"
            width="100%"
            height="300"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="grayscale hover:grayscale-0 transition-all"
            title="Localização da Barbearia Mineiro"
          />
        </div>
      </div>

      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-start">
        <Stack spacing="xl">
          {locationInfo.map((item) => (
            <div key={item.title} className="flex gap-6">
              <span className="material-symbols-outlined text-[#D4AF37] text-3xl flex-shrink-0">
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
        <div className="rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.2)] shadow-lg">
          <iframe
            src="https://www.google.com/maps?q=R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000&output=embed"
            width="100%"
            height="500"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="grayscale hover:grayscale-0 transition-all"
            title="Localização da Barbearia Mineiro"
          />
        </div>
      </div>
    </Section>
  );
}
