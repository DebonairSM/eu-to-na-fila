import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_50%)] animate-spin-slow" />

        <div className="relative z-10 container mx-auto px-4 text-center max-w-4xl">
          <div className="inline-block px-5 py-2 mb-8 border border-primary/40 rounded-full text-primary text-xs font-medium uppercase tracking-wider">
            Orlando, Florida
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6">
            <span className="text-primary">Barbearia</span>
            <br />
            Mineiro
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Tradição e qualidade em cada corte. Entre na fila online e seja atendido sem espera.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/join">
              <Button size="lg" className="w-full sm:w-auto">
                <span className="material-symbols-outlined">person_add</span>
                Entrar na Fila
              </Button>
            </Link>
            <a href="#location">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <span className="material-symbols-outlined">location_on</span>
                Como Chegar
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-4">
              Nossos Serviços
            </p>
            <h2 className="text-4xl font-bold">Cortes & Tratamentos</h2>
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
      <section id="about" className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
            <div>
              <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-4">
                Sobre Nós
              </p>
              <h3 className="text-4xl font-bold mb-6">
                Uma experiência <span className="text-primary">autêntica</span> de barbearia
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
      <section id="location" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-4">
              Localização
            </p>
            <h2 className="text-4xl font-bold">Visite-nos</h2>
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
      <section className="py-24 bg-gradient-to-br from-muted to-background">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-4xl font-bold mb-5">Pronto para um novo visual?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Entre na fila online agora e seja atendido sem espera.
          </p>
          <Link to="/join">
            <Button size="lg">
              <span className="material-symbols-outlined">person_add</span>
              Entrar na Fila Agora
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
