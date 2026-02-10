import { cn } from '@/lib/utils';
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

  const loadingText = homeContent?.services?.loadingText ?? 'Carregando serviços...';
  const emptyText = homeContent?.services?.emptyText ?? 'Nenhum serviço cadastrado.';

  if (isLoading) {
    return (
      <Section id="services" variant="secondary">
        <div className="text-center py-12">
          <LoadingSpinner size="lg" text={loadingText} />
        </div>
      </Section>
    );
  }

  return (
    <Section id="services" variant="secondary">
      <div className="text-center mb-12">
        <Heading level={2} className={cn('section-title', 'section-title--layout')}>{sectionTitle}</Heading>
      </div>

      {activeServices.length === 0 ? (
        <div className="text-center py-8">
          <Text variant="secondary">{emptyText}</Text>
        </div>
      ) : (
        <>
          {/* Mobile: stacked, full width */}
          <div className="lg:hidden space-y-4">
            {activeServices.map((service) => (
              <Card key={service.id} hover className="service-card text-center">
                <CardContent className="p-6">
                  <span className="service-card__icon material-symbols-outlined text-5xl text-[var(--shop-accent,#D4AF37)] mb-4 block">
                    content_cut
                  </span>
                  <Heading level={3} className="service-card__title mb-2 text-xl">
                    {service.name}
                  </Heading>
                  <Text size="lg" className="service-card__price text-[var(--shop-accent,#D4AF37)] font-semibold">
                    {formatPrice(service.price)}
                  </Text>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: columns = min(service count, 4). 1 service = centered single column. */}
          {(() => {
            const n = activeServices.length;
            const desktopCols = Math.min(Math.max(1, n), 4) as 1 | 2 | 3 | 4;
            const tabletCols = Math.min(desktopCols, 3) as 1 | 2 | 3;
            const isSingle = n === 1;
            return (
              <Grid
                cols={{ mobile: 1, tablet: tabletCols, desktop: desktopCols }}
                gap="lg"
                className={cn(
                  'hidden lg:grid max-w-6xl mx-auto',
                  isSingle && 'max-w-md'
                )}
              >
                {activeServices.map((service) => (
                  <Card key={service.id} hover className="service-card text-center">
                    <CardContent className="p-8">
                      <span className="service-card__icon material-symbols-outlined text-5xl text-[var(--shop-accent,#D4AF37)] mb-4 block">
                        content_cut
                      </span>
                      <Heading level={3} className="service-card__title mb-4 text-2xl">
                        {service.name}
                      </Heading>
                      <Text size="xl" className="service-card__price text-[var(--shop-accent,#D4AF37)] font-semibold text-2xl">
                        {formatPrice(service.price)}
                      </Text>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            );
          })()}
        </>
      )}
    </Section>
  );
}
