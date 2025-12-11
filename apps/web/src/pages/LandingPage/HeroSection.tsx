import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section 
      id="main-content" 
      className="hero relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.05)_0%,transparent_50%)] animate-spin-slow" />

      {/* Content */}
      <div className="hero-content relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile: Centered layout */}
        <div className="lg:hidden text-center">
          <div className="hero-badge inline-block px-3 sm:px-5 py-2 mb-5 sm:mb-8 border border-[rgba(212,175,55,0.4)] rounded-full text-[#D4AF37] text-[11px] sm:text-xs font-medium uppercase tracking-[0.35em] fade-in-down">
            Sangão, Santa Catarina
          </div>
          <h1 className="hero-title font-['Playfair_Display',serif] text-[clamp(2.2rem,7vw,4.5rem)] font-bold leading-[1.1] mb-4 sm:mb-6 fade-in-up" style={{ animationDelay: '0.2s' }}>
            <span className="text-[#D4AF37]">Barbearia</span>
            <br />
            Mineiro
          </h1>
          <p className="hero-subtitle text-base sm:text-xl text-[rgba(255,255,255,0.7)] mb-7 sm:mb-12 max-w-[600px] mx-auto leading-[1.65] fade-in-up" style={{ animationDelay: '0.4s' }}>
            Entre na fila online
          </p>
          <div className="hero-actions flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center fade-in-up" style={{ animationDelay: '0.6s' }}>
            <Link to="/join">
              <Button size="lg" className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#E8C547] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all gap-2 sm:gap-3 w-full sm:w-auto min-h-[52px]">
                <span className="material-symbols-outlined text-xl">person_add</span>
                Entrar na Fila
              </Button>
            </Link>
            <a href="#location">
              <Button variant="outline" size="lg" className="bg-transparent text-white border-2 border-[rgba(255,255,255,0.3)] hover:border-[#D4AF37] hover:text-[#D4AF37] gap-2 sm:gap-3 w-full sm:w-auto min-h-[52px]">
                <span className="material-symbols-outlined text-xl">location_on</span>
                Como Chegar
              </Button>
            </a>
          </div>
        </div>

        {/* Desktop: Side-by-side layout */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center min-h-screen py-20">
          <div className="fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="hero-badge inline-block px-5 py-2 mb-8 border border-[rgba(212,175,55,0.4)] rounded-full text-[#D4AF37] text-xs font-medium uppercase tracking-[0.35em]">
              Sangão, Santa Catarina
            </div>
            <h1 className="hero-title font-['Playfair_Display',serif] text-[clamp(3rem,5vw,5.5rem)] font-bold leading-[1.1] mb-6">
              <span className="text-[#D4AF37]">Barbearia</span>
              <br />
              Mineiro
            </h1>
            <p className="text-xl text-[rgba(255,255,255,0.7)] mb-12 max-w-[500px] leading-[1.65]">
              Entre na fila online
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/join">
                <Button size="lg" className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#E8C547] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all gap-3 min-h-[52px]">
                  <span className="material-symbols-outlined text-xl">person_add</span>
                  Entrar na Fila
                </Button>
              </Link>
              <a href="#location">
                <Button variant="outline" size="lg" className="bg-transparent text-white border-2 border-[rgba(255,255,255,0.3)] hover:border-[#D4AF37] hover:text-[#D4AF37] gap-3 min-h-[52px]">
                  <span className="material-symbols-outlined text-xl">location_on</span>
                  Como Chegar
                </Button>
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="w-full max-w-md aspect-square bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)] rounded-3xl border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
              <span className="material-symbols-outlined text-[12rem] text-[#D4AF37]/30">
                content_cut
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
