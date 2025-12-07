import { CompanyNav } from '@/components/CompanyNav';

export function CompanyHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* Hero */}
        <section className="flex flex-col items-center text-center gap-10 sm:gap-14 px-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#8ad6b0] text-xs font-semibold uppercase tracking-[0.32em] animate-pulse">
            Virtual lines • Florianópolis, SC
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold leading-tight max-w-4xl drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            Filas virtuais premium. Vibrantes, elegantes, essenciais.
          </h1>
          <p className="text-lg text-white/80 max-w-3xl leading-relaxed">
            Espera sem atrito: entrada em segundos, presença clara, acompanhamento ao vivo. Simplicidade radical para redes que exigem segurança e escala.
          </p>
          <div className="relative w-full max-w-4xl">
            <div className="absolute inset-0 rounded-[30px] bg-gradient-to-r from-[#0f3d2e]/35 via-[#D4AF37]/20 to-[#0e1f3d]/35 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
            <div className="relative rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-2xl p-12 space-y-7 shadow-2xl shadow-black/40 text-left">
              <p className="text-sm text-[#8ad6b0] uppercase tracking-[0.2em]">Fluxo essencial</p>
              <h2 className="text-3xl font-semibold text-white drop-shadow">Fila, presença e atendimento em um só lugar</h2>
              <p className="text-base text-white/80 leading-relaxed">
                Entrada via QR ou link, presença confirmada em totem ou mobile, estimativas ao vivo. Equipes e clientes sempre sincronizados.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { title: 'Entrada rápida', detail: 'QR, link ou totem — sem app obrigatório.', icon: 'bolt' },
                  { title: 'Painel ao vivo', detail: 'Chamadas, estimativas e status em tempo real.', icon: 'timeline' },
                ].map((card) => (
                  <div key={card.title} className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#D4AF37] text-2xl">{card.icon}</span>
                      <p className="text-base font-semibold">{card.title}</p>
                    </div>
                    <p className="text-sm text-white/70 mt-2">{card.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/65">
                Explore a galeria para ver experiências e casos. Quando quiser falar, estamos a um clique.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 text-center">
          {[
            { label: 'Atendimentos/dia', value: '240+' },
            { label: 'Tempo médio', value: '~6 min' },
            { label: 'Disponibilidade', value: '99.9%' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
            >
              <p className="text-sm text-white/60">{item.label}</p>
              <p className="text-xl font-semibold text-white mt-1">{item.value}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

