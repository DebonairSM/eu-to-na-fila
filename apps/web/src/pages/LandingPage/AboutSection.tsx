import { Heading, Text, Section, Grid } from '@/components/design-system';

const features = [
  { icon: 'schedule', text: 'Fila online' },
  { icon: 'workspace_premium', text: 'Produtos premium' },
  { icon: 'groups', text: 'Equipe experiente' },
  { icon: 'local_parking', text: 'Estacionamento fácil' },
];

export function AboutSection() {
  return (
    <Section id="about" variant="primary">
      <div className="lg:hidden space-y-8">
        <div>
          <Heading level={2} className="mb-6">
            Sobre
          </Heading>
          <Grid cols={{ mobile: 2 }} gap="md" className="mb-8">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
                  {feature.icon}
                </span>
                <Text size="sm" variant="secondary">
                  {feature.text}
                </Text>
              </div>
            ))}
          </Grid>
        </div>
        <div className="aspect-[4/5] rounded-xl overflow-hidden border border-[rgba(212,175,55,0.2)] shadow-lg">
          <img
            src="/barbershop-image.jpg"
            alt="Interior da barbearia"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=1000&fit=crop&q=80';
            }}
          />
        </div>
      </div>

      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
        <div>
          <Heading level={2} className="mb-6">
            Sobre
          </Heading>
          <Grid cols={{ mobile: 2 }} gap="lg">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#D4AF37] text-3xl">
                  {feature.icon}
                </span>
                <Text size="base" variant="secondary">
                  {feature.text}
                </Text>
              </div>
            ))}
          </Grid>
        </div>
        <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.2)] shadow-lg">
          <img
            src="/barbershop-image.jpg"
            alt="Interior da barbearia"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=1000&fit=crop&q=80';
            }}
          />
        </div>
      </div>
    </Section>
  );
}
