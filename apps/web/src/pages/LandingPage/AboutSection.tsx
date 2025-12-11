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
      {/* Mobile: Single column */}
      <div className="lg:hidden space-y-8">
        <div>
          <Heading level={2} className="mb-4">
            Sobre
          </Heading>
          <Text size="base" variant="secondary" className="mb-8">
            Barbearia em Sangão, SC.
          </Text>
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
        <div className="aspect-[4/5] bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)] rounded-xl border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
          <span className="material-symbols-outlined text-8xl text-[#D4AF37]/30">
            storefront
          </span>
        </div>
      </div>

      {/* Desktop: 2-column layout */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
        <div>
          <Heading level={2} className="mb-6">
            Sobre
          </Heading>
          <Text size="lg" variant="secondary" className="mb-10 max-w-[500px]">
            Barbearia em Sangão, SC.
          </Text>
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
        <div className="aspect-[4/5] bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)] rounded-2xl border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
          <span className="material-symbols-outlined text-[12rem] text-[#D4AF37]/30">
            storefront
          </span>
        </div>
      </div>
    </Section>
  );
}
