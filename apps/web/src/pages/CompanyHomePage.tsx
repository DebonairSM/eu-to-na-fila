import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function CompanyHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f8fb] via-[#eef2ff] to-[#e6ecff] text-[#0f1626]">
      <header className="border-b border-[#d6deff] bg-white/80 backdrop-blur-lg text-[#0f1626]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-extrabold text-lg shadow-lg shadow-[#0f3d2e]/30">
              E
            </div>
            <div>
              <p className="text-sm text-[#4a5568]">EuToNaFila</p>
              <p className="text-lg font-semibold">Virtual Line Software</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <Link to="/about">
              <Button variant="outline" className="border-[#d6deff] text-[#0f1626] hover:border-[#D4AF37] hover:text-[#0f3d2e]">
                Menu
              </Button>
            </Link>
            <Link to="/join">
              <Button variant="outline" className="border-[#d6deff] text-[#0f1626] hover:border-[#D4AF37] hover:text-[#0f3d2e]">
                Ver demo
              </Button>
            </Link>
            <Link to="/login">
              <Button className="bg-[#0f3d2e] text-white hover:bg-[#15503c]">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* Hero */}
        <section className="flex flex-col items-center text-center gap-6 sm:gap-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f2ff] border border-[#d6deff] text-[#0f3d2e] text-xs font-semibold uppercase tracking-[0.2em]">
            Virtual lines • Florianópolis, SC
          </div>
          <h1 className="text-3.5xl sm:text-5xl font-semibold leading-tight max-w-3xl text-[#0c1424]">
            Filas virtuais premium, simples de operar.
          </h1>
          <p className="text-lg text-[#23324f] max-w-2xl">
            Software para redes que querem hospitalidade de alto nível com execução enxuta. Menos atrito, mais controle, pronto para escalar.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <Link to="/join">
              <Button size="lg" className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#e2c25a] shadow-md">
                Ver demo
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-[#d6deff] text-[#0f1626] hover:border-[#0f3d2e] hover:text-[#0f3d2e]">
                Falar com a equipe
              </Button>
            </Link>
          </div>
          <div className="relative w-full max-w-3xl">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#dce6ff] via-[#f7f0d9] to-transparent blur-3xl" />
            <div className="relative rounded-2xl border border-[#d6deff] bg-white/90 backdrop-blur-xl p-7 space-y-4 shadow-2xl shadow-[#9fb1ff]/30 text-left text-[#0f1626]">
              <p className="text-sm text-[#0f3d2e] uppercase tracking-[0.18em]">Experiência integrada</p>
              <h2 className="text-2xl font-semibold">Fila, presença e atendimento em um só fluxo</h2>
              <p className="text-sm text-[#23324f]">
                Clientes entram em segundos, confirmam presença em totem ou mobile e acompanham o tempo estimado. Equipes recebem atualizações em tempo real.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: 'Entrada simplificada', detail: 'QR, link ou totem — sem app obrigatório.' },
                  { title: 'Painel ao vivo', detail: 'Status, estimativas e chamadas instantâneas.' },
                ].map((card) => (
                  <div key={card.title} className="rounded-lg border border-[#e4e9ff] bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-[#0f1626]">{card.title}</p>
                    <p className="text-sm text-[#45557a]">{card.detail}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Link to="/about">
                  <Button variant="outline" className="border-[#d6deff] text-[#0f1626] hover:border-[#0f3d2e] hover:text-[#0f3d2e]">
                    Sobre a plataforma
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#e2c25a]">Fale conosco</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              title: 'Luxo acessível',
              desc: 'Visual premium, filas com presença e avisos claros para o cliente — sem custo imprevisível.',
            },
            {
              title: 'Tempo real',
              desc: 'Atualizações instantâneas via WebSocket para staff, telas de espera e clientes no celular.',
            },
            {
              title: 'Personalização',
              desc: 'Branding, serviços, horários e métricas configuráveis por unidade ou rede inteira.',
            },
          ].map((item) => (
            <Card key={item.title} className="bg-white border-[#d6deff]">
              <CardContent className="p-6 space-y-2">
                <h3 className="text-lg font-semibold text-[#0f1626]">{item.title}</h3>
                <p className="text-sm text-[#45557a]">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-[#d6deff]">
            <CardContent className="p-6 space-y-3">
              <p className="text-[#0f3d2e] text-sm font-semibold uppercase tracking-widest">Para redes</p>
              <h3 className="text-2xl font-semibold text-[#0f1626]">Tecnologia que acompanha a marca</h3>
              <p className="text-[#45557a] text-sm">
                Multi-unidade, perfis (owner, staff, cliente) e métricas completas. Infra segura, pronta para picos e monitorada.
              </p>
              <div className="flex flex-wrap gap-2 text-sm text-[#23324f]">
                <span className="px-3 py-1 rounded-full bg-[#eef2ff]">Multi-loja</span>
                <span className="px-3 py-1 rounded-full bg-[#eef2ff]">Fila com presença</span>
                <span className="px-3 py-1 rounded-full bg-[#eef2ff]">Notificações</span>
                <span className="px-3 py-1 rounded-full bg-[#eef2ff]">Painel em tempo real</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#d6deff]">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#0f1626]">Go-live rápido</h3>
                <span className="text-sm text-[#0f3d2e] font-semibold bg-[#0f3d2e]/10 px-3 py-1 rounded-full">Acompanha onboarding</span>
              </div>
              <ul className="space-y-3 text-sm text-[#45557a]">
                <li>• Onboarding direto da equipe em Florianópolis</li>
                <li>• Templates de operação e branding para começar em dias</li>
                <li>• APIs e WebSocket prontos para painéis e totems</li>
                <li>• Funciona em tablet, totem ou mobile sem instalação</li>
              </ul>
              <div className="flex gap-3 flex-wrap">
                <Link to="/login">
                  <Button className="bg-[#0f3d2e] text-white hover:bg-[#15503c]">Entrar como staff</Button>
                </Link>
                <Link to="/join">
                  <Button variant="outline" className="border-[#d6deff] text-[#0f1626] hover:border-[#D4AF37] hover:text-[#0f3d2e]">
                    Ver fila demo
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-[#0f3d2e]">Pronto para ver na prática?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/network">
              <Button className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#e2c25a]">Ver rede de barbearias</Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="border-[#d6deff] text-[#0f1626] hover:border-[#0f3d2e] hover:text-[#0f3d2e]">
                Falar com a equipe
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

