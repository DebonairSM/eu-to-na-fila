import { Link } from 'react-router-dom';
import { Button, Heading, Text, FadeIn, SlideIn, Container } from '@/components/design-system';

export function HeroSection() {
  return (
    <section
      id="main-content"
      className="hero relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.05)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />

      {/* Content */}
      <Container size="2xl" className="relative z-10 w-full">
        {/* Mobile: Centered layout */}
        <div className="lg:hidden text-center">
          <FadeIn delay={0}>
            <div className="hero-badge inline-block px-3 sm:px-5 py-2 mb-5 sm:mb-8 border border-[rgba(212,175,55,0.4)] rounded-full text-[#D4AF37] text-[11px] sm:text-xs font-medium uppercase tracking-[0.35em]">
              Sangão, Santa Catarina
            </div>
          </FadeIn>
          
          <SlideIn direction="up" delay={200}>
            <Heading level={1} className="mb-4 sm:mb-6">
              <span className="text-[#D4AF37]">Barbearia</span>
              <br />
              Mineiro
            </Heading>
          </SlideIn>
          
          <SlideIn direction="up" delay={400}>
            <Text size="lg" variant="secondary" className="mb-7 sm:mb-12 max-w-[600px] mx-auto">
              Entre na fila online
            </Text>
          </SlideIn>
          
          <SlideIn direction="up" delay={600}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
              <Link to="/join">
                <Button size="lg" fullWidth className="sm:w-auto">
                  <span className="material-symbols-outlined text-xl">person_add</span>
                  Entrar na Fila
                </Button>
              </Link>
              <a href="#location">
                <Button variant="outline" size="lg" fullWidth className="sm:w-auto">
                  <span className="material-symbols-outlined text-xl">location_on</span>
                  Como Chegar
                </Button>
              </a>
            </div>
          </SlideIn>
        </div>

        {/* Desktop: Side-by-side layout */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center min-h-screen py-20">
          <FadeIn delay={200}>
            <div>
              <div className="hero-badge inline-block px-5 py-2 mb-8 border border-[rgba(212,175,55,0.4)] rounded-full text-[#D4AF37] text-xs font-medium uppercase tracking-[0.35em]">
                Sangão, Santa Catarina
              </div>
              <Heading level={1} className="mb-6">
                <span className="text-[#D4AF37]">Barbearia</span>
                <br />
                Mineiro
              </Heading>
              <Text size="xl" variant="secondary" className="mb-12 max-w-[500px]">
                Entre na fila online
              </Text>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/join">
                  <Button size="lg">
                    <span className="material-symbols-outlined text-xl">person_add</span>
                    Entrar na Fila
                  </Button>
                </Link>
                <a href="#location">
                  <Button variant="outline" size="lg">
                    <span className="material-symbols-outlined text-xl">location_on</span>
                    Como Chegar
                  </Button>
                </a>
              </div>
            </div>
          </FadeIn>
          
          <FadeIn delay={400}>
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md aspect-square bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)] rounded-3xl border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
                <span className="material-symbols-outlined text-[12rem] text-[#D4AF37]/30">
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
