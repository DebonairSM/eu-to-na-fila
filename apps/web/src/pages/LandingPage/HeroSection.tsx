import { Link } from 'react-router-dom';
import { Button, Heading, Text, FadeIn, SlideIn, Container } from '@/components/design-system';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { getLayoutBehavior } from '@/lib/layouts';
import { cn } from '@/lib/utils';

export function HeroSection() {
  const { config } = useShopConfig();
  const { name, homeContent, style } = config;
  const layout = style.layout ?? 'centered';
  const behavior = getLayoutBehavior(layout);
  const hero = homeContent?.hero ?? { badge: '', subtitle: '', ctaJoin: 'Entrar na Fila', ctaLocation: 'Como Chegar' };
  const useSplitLayout = behavior.heroSplit;
  const showDecorativeBlock = behavior.showDecorativeBlock;
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
      <div className={useSplitLayout ? 'flex gap-4' : 'flex gap-4 justify-center'}>
        <Link to="/join">
          <Button size="lg" className={behavior.heroOverlay ? 'cta-join' : ''}>
            {!ctaTextOnly && <span className="material-symbols-outlined text-xl">person_add</span>}
            {hero.ctaJoin}
          </Button>
        </Link>
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
      className="hero relative min-h-screen flex items-start justify-center pt-16 lg:items-center lg:pt-0 overflow-hidden"
      style={{ backgroundColor: 'var(--shop-background, #0a0a0a)' }}
    >
      {behavior.heroOverlay && <div className="hero-gradient-overlay absolute inset-0 pointer-events-none z-[1]" aria-hidden />}
      <Container size="2xl" className="relative z-10 w-full">
        <div className="lg:hidden text-center">
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/join">
                <Button size="lg" fullWidth className="sm:w-auto">
                  {!ctaTextOnly && <span className="material-symbols-outlined text-xl">person_add</span>}
                  {hero.ctaJoin}
                </Button>
              </Link>
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
            useSplitLayout ? 'lg:grid-cols-2 lg:gap-12 xl:gap-16' : 'lg:grid-cols-1 lg:gap-0'
          )}
        >
          <FadeIn delay={200}>
            <div
              className={cn(
                useSplitLayout && 'max-w-[560px]',
                !useSplitLayout && 'text-center mx-auto max-w-[760px]',
                behavior.heroFrame && 'hero-frame max-w-3xl mx-auto border border-[var(--shop-border-color,rgba(255,255,255,0.12))] rounded-lg px-8 py-10'
              )}
            >
              {innerContent}
            </div>
          </FadeIn>

          {showDecorativeBlock && (
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
