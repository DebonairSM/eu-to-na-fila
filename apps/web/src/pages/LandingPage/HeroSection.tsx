import { Link } from 'react-router-dom';
import { Button, Heading, Text, FadeIn, SlideIn, Container } from '@/components/design-system';
import { useShopConfig } from '@/contexts/ShopConfigContext';

export function HeroSection() {
  const { config } = useShopConfig();
  const { name, homeContent } = config;
  const hero = homeContent.hero;

  return (
    <section
      id="main-content"
      className="hero relative min-h-screen flex items-start justify-center pt-16 lg:items-center lg:pt-0 overflow-hidden bg-[#0a0a0a]"
    >
      <Container size="2xl" className="relative z-10 w-full">
        <div className="lg:hidden text-center">
          <FadeIn delay={0}>
            <div className="hero-badge">
              {hero.badge}
            </div>
          </FadeIn>
          
          <SlideIn direction="up" delay={200}>
            <Heading level={1} className="mb-6">
              <span className="text-[var(--shop-accent,#D4AF37)]">{name}</span>
            </Heading>
          </SlideIn>
          
          <SlideIn direction="up" delay={400}>
            <Text size="lg" variant="secondary" className="mb-10 max-w-[600px] mx-auto">
              {hero.subtitle}
            </Text>
          </SlideIn>
          
          <SlideIn direction="up" delay={600}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/join">
                <Button size="lg" fullWidth className="sm:w-auto">
                  <span className="material-symbols-outlined text-xl">person_add</span>
                  {hero.ctaJoin}
                </Button>
              </Link>
              <a href="#location">
                <Button variant="outline" size="lg" fullWidth className="sm:w-auto">
                  <span className="material-symbols-outlined text-xl">location_on</span>
                  {hero.ctaLocation}
                </Button>
              </a>
            </div>
          </SlideIn>
        </div>

        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center min-h-screen py-20">
          <FadeIn delay={200}>
            <div>
              <div className="hero-badge mb-6">
                {hero.badge}
              </div>
              <Heading level={1} className="mb-6">
                <span className="text-[var(--shop-accent,#D4AF37)]">{name}</span>
              </Heading>
              <Text size="xl" variant="secondary" className="mb-12 max-w-[500px]">
                {hero.subtitle}
              </Text>
              <div className="flex gap-4">
                <Link to="/join">
                  <Button size="lg">
                    <span className="material-symbols-outlined text-xl">person_add</span>
                    {hero.ctaJoin}
                  </Button>
                </Link>
                <a href="#location">
                  <Button variant="outline" size="lg">
                    <span className="material-symbols-outlined text-xl">location_on</span>
                    {hero.ctaLocation}
                  </Button>
                </a>
              </div>
            </div>
          </FadeIn>
          
          <FadeIn delay={400}>
            <div className="flex items-center justify-center">
              <div className="w-full max-w-[200px] aspect-square rounded-2xl border border-[rgba(255,255,255,0.08)] flex items-center justify-center bg-[rgba(255,255,255,0.02)]">
                <span className="material-symbols-outlined text-5xl text-[var(--shop-accent,#D4AF37)]/20">
                  content_cut
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
