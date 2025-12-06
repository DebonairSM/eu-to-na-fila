import { Card, CardContent } from '@/components/ui/card';
import { CompanyNav } from '@/components/CompanyNav';

export function CompanyHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* Hero */}
        <section className="flex flex-col items-center text-center gap-7 sm:gap-9">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#8ad6b0] text-xs font-semibold uppercase tracking-[0.28em] animate-pulse">
            Virtual lines • Florianópolis, SC
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold leading-tight max-w-3xl drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            Filas virtuais premium. Vibrantes, elegantes, essenciais.
          </h1>
          <p className="text-lg text-white/80 max-w-2xl">
            Espera sem atrito: entrada em segundos, presença clara, acompanhamento ao vivo. Simplicidade radical para redes que exigem segurança e escala.
          </p>
          <div className="relative w-full max-w-3xl">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#0f3d2e]/25 via-[#D4AF37]/16 to-[#0e1f3d]/30 blur-3xl animate-pulse" />
            <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 space-y-5 shadow-2xl shadow-black/40 text-left">
              <p className="text-sm text-[#8ad6b0] uppercase tracking-[0.18em]">Fluxo essencial</p>
              <h2 className="text-2xl font-semibold text-white drop-shadow">Fila, presença e atendimento em um só lugar</h2>
              <p className="text-sm text-white/75">
                Entrada via QR ou link, presença confirmada em totem ou mobile, estimativas ao vivo. Equipes e clientes sempre sincronizados.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: 'Entrada rápida', detail: 'QR, link ou totem — sem app obrigatório.', icon: 'bolt' },
                  { title: 'Painel ao vivo', detail: 'Chamadas, estimativas e status em tempo real.', icon: 'timeline' },
                ].map((card) => (
                  <div key={card.title} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#D4AF37] text-lg">{card.icon}</span>
                      <p className="text-sm font-semibold">{card.title}</p>
                    </div>
                    <p className="text-sm text-white/70 mt-1">{card.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/65">
                Explore a galeria para ver experiências e casos. Quando quiser falar, estamos a um clique.
              </p>
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

        {/* Spacer to keep layout breathing without extra CTA clutter */}
        <section className="h-6" aria-hidden="true" />
      </main>
    </div>
  );
}

