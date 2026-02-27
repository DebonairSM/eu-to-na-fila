import { cn } from '@/lib/utils';
import { Card, CardContent, Heading, Text, Section, Grid } from '@/components/design-system';
import { useShopHomeContent } from '@/contexts/ShopConfigContext';
import { useServices } from '@/hooks/useServices';
import { useLocale } from '@/contexts/LocaleContext';
import { formatCurrency } from '@/lib/format';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function ServicesSection() {
  const homeContent = useShopHomeContent();
  const { locale, t } = useLocale();
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
                <CardContent className="py-6 px-3">
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

          {/* Desktop: 1–3 = simple grid; 4 = 3 + 1 centered; 5 = 2 top (between cracks) + 3 bottom; 6+ = 3 cols, last row centered when partial */}
          {(() => {
            const n = activeServices.length;
            const isSingle = n === 1;

            const serviceCard = (service: (typeof activeServices)[0]) => (
              <Card key={service.id} hover className="service-card text-center h-full">
                <CardContent className="py-8 px-4">
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
            );

            if (n === 4) {
              return (
                <div
                  className={cn(
                    'hidden lg:grid max-w-6xl mx-auto gap-8',
                    'grid-cols-3'
                  )}
                  style={{ gap: 'var(--spacing-lg, 1.5rem)' }}
                >
                  {activeServices.slice(0, 3).map(serviceCard)}
                  <div className="col-start-2 flex justify-center">{serviceCard(activeServices[3])}</div>
                </div>
              );
            }

            if (n === 5) {
              return (
                <div
                  className="hidden lg:grid max-w-6xl mx-auto gap-8"
                  style={{
                    gap: 'var(--spacing-lg, 1.5rem)',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gridTemplateRows: 'auto auto',
                  }}
                >
                  <div className="col-span-2 col-start-2 row-start-1 flex justify-center">{serviceCard(activeServices[3])}</div>
                  <div className="col-span-2 col-start-4 row-start-1 flex justify-center">{serviceCard(activeServices[4])}</div>
                  <div className="col-span-2 row-start-2">{serviceCard(activeServices[0])}</div>
                  <div className="col-span-2 row-start-2">{serviceCard(activeServices[1])}</div>
                  <div className="col-span-2 row-start-2">{serviceCard(activeServices[2])}</div>
                </div>
              );
            }

            if (n >= 6) {
              const cols = 3;
              const fullRows = Math.floor(n / cols);
              const remainder = n % cols;
              const restStart = fullRows * cols;
              return (
                <div
                  className="hidden lg:grid max-w-6xl mx-auto gap-8"
                  style={{
                    gap: 'var(--spacing-lg, 1.5rem)',
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  }}
                >
                  {activeServices.slice(0, restStart).map(serviceCard)}
                  {remainder === 1 && (
                    <div className="col-start-2 flex justify-center">{serviceCard(activeServices[restStart])}</div>
                  )}
                  {remainder === 2 && (
                    <div className="col-span-3 flex justify-center gap-8" style={{ gap: 'var(--spacing-lg, 1.5rem)' }}>
                      {serviceCard(activeServices[restStart])}
                      {serviceCard(activeServices[restStart + 1])}
                    </div>
                  )}
                </div>
              );
            }

            const desktopCols = Math.min(Math.max(1, n), 4) as 1 | 2 | 3 | 4;
            const tabletCols = Math.min(desktopCols, 3) as 1 | 2 | 3;
            return (
              <Grid
                cols={{ mobile: 1, tablet: tabletCols, desktop: desktopCols }}
                gap="lg"
                className={cn(
                  'hidden lg:grid max-w-6xl mx-auto',
                  isSingle && 'max-w-md'
                )}
              >
                {activeServices.map(serviceCard)}
              </Grid>
            );
          })()}
        </>
      )}
    </Section>
  );
}
