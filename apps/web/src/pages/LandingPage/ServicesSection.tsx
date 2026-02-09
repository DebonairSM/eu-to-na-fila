import { Card, CardContent, Heading, Text, Section, Grid } from '@/components/design-system';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useServices } from '@/hooks/useServices';
import { LoadingSpinner } from '@/components/LoadingSpinner';

/** Format price (stored in cents) for display. */
function formatPrice(cents: number | undefined): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function ServicesSection() {
  const { config } = useShopConfig();
  const { homeContent } = config;
  const { activeServices, isLoading } = useServices();
  const sectionTitle = homeContent?.services?.sectionTitle ?? 'Serviços';

  if (isLoading) {
    return (
      <Section id="services" variant="secondary">
        <div className="text-center py-12">
          <LoadingSpinner size="lg" text="Carregando serviços..." />
        </div>
      </Section>
    );
  }

  return (
    <Section id="services" variant="secondary">
      <div className="text-center mb-12">
        <Heading level={2}>{sectionTitle}</Heading>
      </div>

      {activeServices.length === 0 ? (
        <div className="text-center py-8">
          <Text variant="secondary">Nenhum serviço cadastrado.</Text>
        </div>
      ) : (
        <>
          <div className="lg:hidden space-y-4">
            {activeServices.map((service) => (
              <Card key={service.id} hover className="text-center">
                <CardContent className="p-6">
                  <span className="material-symbols-outlined text-5xl text-[var(--shop-accent,#D4AF37)] mb-4 block">
                    content_cut
                  </span>
                  <Heading level={3} className="mb-2 text-xl">
                    {service.name}
                  </Heading>
                  <Text size="lg" className="text-[var(--shop-accent,#D4AF37)] font-semibold">
                    {formatPrice(service.price)}
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
            {activeServices.map((service) => (
              <Card key={service.id} hover className="text-center">
                <CardContent className="p-8">
                  <span className="material-symbols-outlined text-5xl text-[var(--shop-accent,#D4AF37)] mb-4 block">
                    content_cut
                  </span>
                  <Heading level={3} className="mb-4 text-2xl">
                    {service.name}
                  </Heading>
                  <Text size="xl" className="text-[var(--shop-accent,#D4AF37)] font-semibold text-2xl">
                    {formatPrice(service.price)}
                  </Text>
                </CardContent>
              </Card>
            ))}
          </Grid>
        </>
      )}
    </Section>
  );
}
