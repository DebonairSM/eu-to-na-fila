import { cn } from '@/lib/utils';
import { Card, CardContent, Heading, Text, Section, Grid } from '@/components/design-system';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useServices } from '@/hooks/useServices';
import { useLocale } from '@/contexts/LocaleContext';
import { formatCurrency } from '@/lib/format';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function ServicesSection() {
  const { config } = useShopConfig();
  const { locale, t } = useLocale();
  const { homeContent } = config;
  const { activeServices, isLoading } = useServices();
  const sectionTitle = homeContent?.services?.sectionTitle ?? t('nav.services');

  const loadingText = homeContent?.services?.loadingText ?? t('common.loading');
  const emptyText = homeContent?.services?.emptyText ?? t('services.emptyText');

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
                    {formatCurrency(service.price, locale)}
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
                        {formatCurrency(service.price, locale)}
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
