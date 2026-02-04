import { Card, CardContent, Heading, Text, Section, Grid } from '@/components/design-system';

const services = [
  {
    icon: 'content_cut',
    name: 'Corte',
    price: '$30',
  },
  {
    icon: 'face_6',
    name: 'Barba',
    price: '$20',
  },
  {
    icon: 'star',
    name: 'Corte + Barba',
    price: '$45',
  },
];

export function ServicesSection() {
  return (
    <Section id="services" variant="secondary">
      <div className="text-center mb-12">
        <Heading level={2}>Serviços</Heading>
      </div>

      <div className="lg:hidden space-y-4">
        {services.map((service) => (
          <Card key={service.name} hover className="text-center">
            <CardContent className="p-6">
              <span className="material-symbols-outlined text-5xl text-[#D4AF37] mb-4 block">
                {service.icon}
              </span>
              <Heading level={3} className="mb-2 text-xl">
                {service.name}
              </Heading>
              <Text size="lg" className="text-[#D4AF37] font-semibold">
                {service.price}
              </Text>
            </CardContent>
          </Card>
        ))}
      </div>

      <Grid
        cols={{ mobile: 1, tablet: 2, desktop: 3 }}
        gap="lg"
        className="hidden lg:grid max-w-6xl mx-auto"
      >
        {services.map((service) => (
          <Card key={service.name} hover className="text-center">
            <CardContent className="p-8">
              <span className="material-symbols-outlined text-5xl text-[#D4AF37] mb-4 block">
                {service.icon}
              </span>
              <Heading level={3} className="mb-4 text-2xl">
                {service.name}
              </Heading>
              <Text size="xl" className="text-[#D4AF37] font-semibold text-2xl">
                {service.price}
              </Text>
            </CardContent>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}
