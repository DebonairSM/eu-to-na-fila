import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function CompanyHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <header className="border-b border-white/10 bg-[rgba(5,12,24,0.85)] backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-extrabold text-lg shadow-lg shadow-[#0f3d2e]/40">
              E
            </div>
            <div>
              <p className="text-sm text-white/70">EuToNaFila</p>
              <p className="text-lg font-semibold">Virtual Line Software</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/join">
              <Button variant="outline" className="border-white/20 text-white hover:border-[#D4AF37] hover:text-[#D4AF37]">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f3d2e]/25 border border-[#0f3d2e]/40 text-[#8ad6b0] text-xs font-semibold uppercase tracking-[0.2em]">
            Virtual lines • Florianópolis, SC
          </div>
          <h1 className="text-3.5xl sm:text-5xl font-semibold leading-tight max-w-3xl">
            Filas virtuais premium, simples de operar.
          </h1>
          <p className="text-lg text-white/75 max-w-2xl">
            Software para redes que querem hospitalidade de alto nível com execução enxuta. Menos atrito, mais controle, pronto para escalar.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <Link to="/join">
              <Button size="lg" className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#e2c25a]">
                Ver demo
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:border-[#0f3d2e] hover:text-[#0f3d2e]">
                Falar com a equipe
              </Button>
            </Link>
          </div>
          <div className="relative w-full max-w-3xl">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#0f3d2e]/25 via-[#D4AF37]/10 to-transparent blur-3xl" />
            <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-7 space-y-4 shadow-2xl shadow-black/40 text-left">
              <p className="text-sm text-[#8ad6b0] uppercase tracking-[0.18em]">Experiência integrada</p>
              <h2 className="text-2xl font-semibold text-white">Fila, presença e atendimento em um só fluxo</h2>
              <p className="text-sm text-white/70">
                Clientes entram em segundos, confirmam presença em totem ou mobile e acompanham o tempo estimado. Equipes recebem atualizações em tempo real.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: 'Entrada simplificada', detail: 'QR, link ou totem — sem app obrigatório.' },
                  { title: 'Painel ao vivo', detail: 'Status, estimativas e chamadas instantâneas.' },
                ].map((card) => (
                  <div key={card.title} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-sm font-semibold">{card.title}</p>
                    <p className="text-sm text-white/70">{card.detail}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Link to="/about">
                  <Button variant="outline" className="border-white/15 text-white hover:border-[#0f3d2e] hover:text-[#0f3d2e]">
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
            <Card key={item.title} className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-2">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-white/70">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-[#0c243f] to-[#0b1e34] border-white/10">
            <CardContent className="p-6 space-y-3">
              <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest">Para redes</p>
              <h3 className="text-2xl font-semibold">Tecnologia que acompanha a marca</h3>
              <p className="text-white/75 text-sm">
                Multi-unidade, perfis (owner, staff, cliente) e métricas completas. Infra segura, pronta para picos e monitorada.
              </p>
              <div className="flex flex-wrap gap-2 text-sm text-white/80">
                <span className="px-3 py-1 rounded-full bg-white/10">Multi-loja</span>
                <span className="px-3 py-1 rounded-full bg-white/10">Fila com presença</span>
                <span className="px-3 py-1 rounded-full bg-white/10">Notificações</span>
                <span className="px-3 py-1 rounded-full bg-white/10">Painel em tempo real</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Go-live rápido</h3>
                <span className="text-sm text-[#0f3d2e] font-semibold bg-[#0f3d2e]/15 px-3 py-1 rounded-full">Acompanha onboarding</span>
              </div>
              <ul className="space-y-3 text-sm text-white/75">
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
                  <Button variant="outline" className="border-white/20 text-white hover:border-[#D4AF37] hover:text-[#D4AF37]">
                    Ver fila demo
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-[#D4AF37]">Pronto para ver na prática?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/network">
              <Button className="bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#e2c25a]">Ver rede de barbearias</Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="border-white/20 text-white hover:border-[#0f3d2e] hover:text-[#0f3d2e]">
                Falar com a equipe
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

