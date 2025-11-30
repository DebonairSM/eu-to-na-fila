import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section id="main-content" className="hero relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.05)_0%,transparent_50%)] animate-spin-slow" />

        <div className="hero-content relative z-10 text-center px-5 max-w-[900px] mx-auto">
          <div className="hero-badge inline-block px-5 py-2 mb-8 border border-[rgba(212,175,55,0.4)] rounded-full text-[#D4AF37] text-xs font-medium uppercase tracking-widest fade-in-down">
            Orlando, Florida
          </div>
          <h1 className="hero-title font-['Playfair_Display',serif] text-[clamp(3rem,10vw,6rem)] font-bold leading-[1.1] mb-6 fade-in-up" style={{ animationDelay: '0.2s' }}>
            <span className="text-[#D4AF37]">Barbearia</span>
            <br />
            Mineiro
          </h1>
          <p className="hero-subtitle text-xl text-[rgba(255,255,255,0.7)] mb-12 max-w-[600px] mx-auto leading-[1.7] fade-in-up" style={{ animationDelay: '0.4s' }}>
            Tradição e qualidade em cada corte. Entre na fila online e seja atendido sem espera.
          </p>
          <div className="hero-actions flex gap-4 justify-center flex-wrap fade-in-up" style={{ animationDelay: '0.6s' }}>
            <Link to="/join">
              <Button size="lg" className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#E8C547] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all">
                <span className="material-symbols-outlined">person_add</span>
                Entrar na Fila
              </Button>
            </Link>
            <a href="#location">
              <Button variant="outline" size="lg" className="bg-transparent text-white border-2 border-[rgba(255,255,255,0.3)] hover:border-[#D4AF37] hover:text-[#D4AF37]">
                <span className="material-symbols-outlined">location_on</span>
                Como Chegar
              </Button>
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="hero-scroll absolute bottom-10 left-1/2 -translate-x-1/2 text-[rgba(255,255,255,0.5)] text-xs uppercase tracking-widest flex flex-col items-center gap-3 animate-bounce-slow">
          <span>Scroll</span>
          <span className="material-symbols-outlined">expand_more</span>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="section py-[120px] px-10 bg-[#1a1a1a]">
        <div className="container mx-auto px-4">
          <div className="section-header text-center mb-16 max-w-full">
            <p className="section-label text-[#D4AF37] text-xs font-semibold uppercase tracking-[3px] mb-4">
              Nossos Serviços
            </p>
            <h2 className="section-title font-['Playfair_Display',serif] text-[clamp(2rem,5vw,3rem)] font-semibold">
              Cortes & Tratamentos
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: 'content_cut',
                name: 'Corte de Cabelo',
                desc: 'Corte tradicional ou moderno, feito com precisão e cuidado.',
                price: '$30',
              },
              {
                icon: 'face_6',
                name: 'Barba',
                desc: 'Aparar, modelar e cuidar da sua barba com produtos premium.',
                price: '$20',
              },
              {
                icon: 'star',
                name: 'Corte + Barba',
                desc: 'O combo completo para você sair renovado.',
                price: '$45',
              },
            ].map((service) => (
              <Card key={service.name} className="text-center hover:border-primary transition-colors">
                <CardContent className="p-8">
                  <span className="material-symbols-outlined text-5xl text-primary mb-4 block">
                    {service.icon}
                  </span>
                  <h3 className="text-xl font-semibold mb-3">{service.name}</h3>
                  <p className="text-muted-foreground mb-4 text-sm">{service.desc}</p>
                  <p className="text-primary text-xl font-semibold">{service.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="section py-[120px] px-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
            <div>
              <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-[3px] mb-4">
                Sobre Nós
              </p>
              <h3 className="font-['Playfair_Display',serif] text-[clamp(2rem,5vw,3rem)] font-semibold mb-6">
                Uma experiência <span className="text-[#D4AF37]">autêntica</span> de barbearia
              </h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Na Barbearia Mineiro, combinamos técnicas tradicionais com tendências modernas
                para oferecer cortes de qualidade. Nossa equipe é apaixonada pelo que faz e
                comprometida em proporcionar a melhor experiência.
              </p>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Localizada em Orlando, FL, atendemos a comunidade brasileira e todos que
                buscam um serviço de excelência em um ambiente acolhedor.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: 'schedule', text: 'Fila online' },
                  { icon: 'workspace_premium', text: 'Produtos premium' },
                  { icon: 'groups', text: 'Equipe experiente' },
                  { icon: 'local_parking', text: 'Estacionamento fácil' },
                ].map((feature) => (
                  <div key={feature.text} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">
                      {feature.icon}
                    </span>
                    <span className="text-sm">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="aspect-[4/5] bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-8xl text-primary/30">
                storefront
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="location" className="section py-[120px] px-10 bg-[#1a1a1a]">
        <div className="container mx-auto px-4">
          <div className="section-header text-center mb-16 max-w-full">
            <p className="section-label text-[#D4AF37] text-xs font-semibold uppercase tracking-[3px] mb-4">
              Localização
            </p>
            <h2 className="section-title font-['Playfair_Display',serif] text-[clamp(2rem,5vw,3rem)] font-semibold">
              Visite-nos
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-5xl mx-auto">
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold mb-6">Informações de Contato</h3>
              {[
                {
                  icon: 'location_on',
                  title: 'Endereço',
                  content: (
                    <>
                      Orlando, FL
                      <br />
                      <a
                        href="https://maps.app.goo.gl/ZBiFuM3hgavG7ctM9"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Ver no Google Maps
                      </a>
                    </>
                  ),
                },
                {
                  icon: 'schedule',
                  title: 'Horário de Funcionamento',
                  content: (
                    <>
                      Segunda a Sábado: 9:00 - 19:00
                      <br />
                      Domingo: Fechado
                    </>
                  ),
                },
                {
                  icon: 'phone',
                  title: 'Telefone',
                  content: (
                    <a href="tel:+14071234567" className="text-primary hover:underline">
                      (407) 123-4567
                    </a>
                  ),
                },
                {
                  icon: 'language',
                  title: 'Idiomas',
                  content: 'Português & English',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0">
                    {item.icon}
                  </span>
                  <div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl overflow-hidden border border-primary/20">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d224444.94052046655!2d-81.52451835!3d28.481398349999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88e773d8fecdbc77%3A0xac3b2063ca5bf9e!2sOrlando%2C%20FL!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale hover:grayscale-0 transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section py-[120px] px-10 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-['Playfair_Display',serif] text-[clamp(2rem,5vw,3rem)] font-semibold mb-5">
            Pronto para um novo visual?
          </h2>
          <p className="text-lg text-[rgba(255,255,255,0.7)] mb-8">
            Entre na fila online agora e seja atendido sem espera.
          </p>
          <Link to="/join">
            <Button size="lg" className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#E8C547]">
              <span className="material-symbols-outlined">person_add</span>
              Entrar na Fila Agora
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
