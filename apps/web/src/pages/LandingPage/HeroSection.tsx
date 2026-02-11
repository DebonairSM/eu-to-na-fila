import { Link } from 'react-router-dom';
import { Button, Heading, Text, FadeIn, SlideIn, Container } from '@/components/design-system';
import { useShopConfig, useShopHomeContent } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getLayoutBehavior } from '@/lib/layouts';
import { cn } from '@/lib/utils';

function hasScheduleEnabled(settings: { allowAppointments?: boolean; operatingHours?: unknown }): boolean {
  if (!settings?.allowAppointments) return false;
  const hours = settings.operatingHours as Record<string, { open?: string; close?: string } | null> | undefined;
  if (!hours || typeof hours !== 'object') return false;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  return days.some((d) => {
    const h = hours[d];
    return h != null && typeof h === 'object' && h.open != null && h.close != null;
  });
}

export function HeroSection() {
  const { t } = useLocale();
  const { config } = useShopConfig();
  const homeContent = useShopHomeContent();
  const { name, style } = config;
  const layout = style.layout ?? 'centered';
  const behavior = getLayoutBehavior(layout);
  const hero = homeContent?.hero ?? {
    badge: '',
    subtitle: '',
    ctaJoin: t('shop.heroCtaJoinDefault'),
    ctaLocation: t('shop.heroCtaLocationDefault'),
  };
  const useSplitLayout = behavior.heroSplit;
  const showDecorativeBlock = behavior.showDecorativeBlock;
  const heroCard = behavior.heroCard ?? false;
  const heroBanner = behavior.heroBanner ?? false;
  const heroNarrow = behavior.heroNarrow ?? false;
  const heroAsymmetric = behavior.heroAsymmetric ?? false;
  const showSchedule = hasScheduleEnabled(config.settings ?? {});
  const badgeClass = cn(
    'hero-badge mb-6',
    behavior.badgeStyle === 'label' && 'hero-badge--label',
    behavior.badgeStyle === 'minimal' && 'hero-badge--minimal'
  );
  const showBadge = (behavior.badgeStyle !== 'minimal' || hero.badge);
  const ctaTextOnly = behavior.ctaTextOnly;

  const innerContent = (
    <>
      {showBadge && (
        <div className={badgeClass}>
          {hero.badge}
        </div>
      )}
      <Heading level={1} className="mb-6">
        <span className="text-[var(--shop-accent,#D4AF37)]">{name}</span>
      </Heading>
      <Text size="xl" variant="secondary" className={cn('mb-12', useSplitLayout ? '' : 'max-w-[500px] mx-auto text-center')}>
        {hero.subtitle}
      </Text>
      <div className={useSplitLayout ? 'flex gap-4 flex-wrap' : 'flex gap-4 justify-center flex-wrap'}>
        <Link to="/join">
          <Button size="lg" className={behavior.heroOverlay ? 'cta-join' : ''}>
            {!ctaTextOnly && <span className="material-symbols-outlined text-xl">person_add</span>}
            {hero.ctaJoin}
          </Button>
        </Link>
        {showSchedule && (
          <Link to="/schedule">
            <Button variant="outline" size="lg" className={behavior.heroOverlay ? 'cta-join' : ''}>
              {!ctaTextOnly && <span className="material-symbols-outlined text-xl">event</span>}
              {t('join.scheduleForLater')}
            </Button>
          </Link>
        )}
        <a href="#location">
          <Button variant="outline" size="lg" className={behavior.heroOverlay ? 'cta-location' : ''}>
            {!ctaTextOnly && <span className="material-symbols-outlined text-xl">location_on</span>}
            {hero.ctaLocation}
          </Button>
        </a>
      </div>
    </>
  );

  return (
    <section
      id="main-content"
      className={cn(
        'hero relative min-h-screen overflow-hidden',
        heroBanner ? 'flex flex-col justify-end pt-16 lg:pt-0 lg:min-h-[85vh]' : 'flex items-start justify-center pt-16 lg:items-center lg:pt-0'
      )}
      style={{ backgroundColor: 'var(--shop-background, #0a0a0a)' }}
    >
      {behavior.heroOverlay && <div className="hero-gradient-overlay absolute inset-0 pointer-events-none z-[1]" aria-hidden />}
      <Container size="2xl" className={cn('relative z-10 w-full', heroBanner && 'hero-banner-container')}>
        <div className={cn('lg:hidden text-center', heroBanner && 'hero-band')}>
          <FadeIn delay={0}>
            {showBadge && (
              <div className={badgeClass}>
                {hero.badge}
              </div>
            )}
          </FadeIn>
          <SlideIn direction="up" delay={200}>
            <Heading level={1} className="mb-6">
              <span className="text-[var(--shop-accent,#D4AF37)]">{name}</span>
            </Heading>
          </SlideIn>
          <SlideIn direction="up" delay={400}>
            <Text size="lg" variant="secondary" className="mb-10 max-w-[600px] mx-auto text-center">
              {hero.subtitle}
            </Text>
          </SlideIn>
          <SlideIn direction="up" delay={600}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <Link to="/join">
                <Button size="lg" fullWidth className="sm:w-auto">
                  {!ctaTextOnly && <span className="material-symbols-outlined text-xl">person_add</span>}
                  {hero.ctaJoin}
                </Button>
              </Link>
              {showSchedule && (
                <Link to="/schedule">
                  <Button variant="outline" size="lg" fullWidth className="sm:w-auto">
                    {!ctaTextOnly && <span className="material-symbols-outlined text-xl">event</span>}
                    {t('join.scheduleForLater')}
                  </Button>
                </Link>
              )}
              <a href="#location">
                <Button variant="outline" size="lg" fullWidth className="sm:w-auto">
                  {!ctaTextOnly && <span className="material-symbols-outlined text-xl">location_on</span>}
                  {hero.ctaLocation}
                </Button>
              </a>
            </div>
          </SlideIn>
        </div>

        <div
          className={cn(
            'hidden lg:grid items-center min-h-screen py-20',
            heroBanner && 'min-h-0 py-12 lg:py-16',
            useSplitLayout && !heroAsymmetric && 'lg:grid-cols-2 lg:gap-12 xl:gap-16',
            useSplitLayout && heroAsymmetric && 'lg:grid-cols-[1.1fr_1.4fr] xl:grid-cols-[1fr_1.5fr] lg:gap-14 xl:gap-20',
            !useSplitLayout && 'lg:grid-cols-1 lg:gap-0'
          )}
        >
          {showDecorativeBlock && heroAsymmetric && (
            <FadeIn delay={400} className="order-1 flex items-center justify-center">
              <div className="w-full max-w-[220px] aspect-square rounded-2xl border-[length:var(--shop-border-width,1px)] border-[style:var(--shop-border-style,solid)] border-[rgba(255,255,255,0.08)] flex items-center justify-center bg-[rgba(255,255,255,0.02)]">
                <span className="material-symbols-outlined text-5xl text-[var(--shop-accent,#D4AF37)]/20">
                  content_cut
                </span>
              </div>
            </FadeIn>
          )}
          <FadeIn delay={200} className={showDecorativeBlock && heroAsymmetric ? 'order-2' : ''}>
            <div
              className={cn(
                useSplitLayout && !heroAsymmetric && 'max-w-[560px]',
                useSplitLayout && heroAsymmetric && 'max-w-[520px]',
                !useSplitLayout && 'text-center mx-auto',
                !useSplitLayout && !heroNarrow && 'max-w-[760px]',
                heroNarrow && 'max-w-md',
                behavior.heroFrame && !heroCard && 'hero-frame max-w-3xl mx-auto border border-[var(--shop-border-color,rgba(255,255,255,0.12))] rounded-lg px-8 py-10',
                heroCard && 'hero-card mx-auto',
                heroBanner && 'hero-band'
              )}
            >
              {innerContent}
            </div>
          </FadeIn>

          {showDecorativeBlock && !heroAsymmetric && (
            <FadeIn delay={400}>
              <div className="flex items-center justify-center">
                <div className="w-full max-w-[200px] aspect-square rounded-2xl border-[length:var(--shop-border-width,1px)] border-[style:var(--shop-border-style,solid)] border-[rgba(255,255,255,0.08)] flex items-center justify-center bg-[rgba(255,255,255,0.02)]">
                  <span className="material-symbols-outlined text-5xl text-[var(--shop-accent,#D4AF37)]/20">
                    content_cut
                  </span>
                </div>
              </div>
            </FadeIn>
          )}
        </div>
      </Container>
    </section>
  );
}
