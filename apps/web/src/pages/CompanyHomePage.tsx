import { CompanyNav } from '@/components/CompanyNav';

export function CompanyHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-5 py-10 sm:py-14 space-y-12 sm:space-y-16">
        {/* Hero */}
        <section className="flex flex-col items-center text-center gap-8 sm:gap-12 px-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/8 border border-white/12 text-[#8ad6b0] text-[11px] sm:text-xs font-semibold uppercase tracking-[0.28em] animate-pulse">
            Virtual lines • Florianópolis, SC
          </div>
          <h1 className="text-[2.2rem] sm:text-5xl font-semibold leading-tight max-w-4xl drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            Filas virtuais premium
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-3xl leading-relaxed">
            Entrada rápida, presença clara, acompanhamento ao vivo.
          </p>
          <div className="relative w-full max-w-4xl">
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-[#0f3d2e]/32 via-[#D4AF37]/18 to-[#0e1f3d]/30 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
            <div className="relative rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl p-9 sm:p-12 space-y-6 sm:space-y-7 shadow-2xl shadow-black/40 text-left">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white drop-shadow">Fila, presença e atendimento</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {[
                  { title: 'Entrada rápida', detail: 'QR, link ou totem', icon: 'bolt' },
                  { title: 'Painel ao vivo', detail: 'Estimativas em tempo real', icon: 'timeline' },
                ].map((card) => (
                  <div key={card.title} className="rounded-xl border border-white/10 bg-white/6 px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#D4AF37] text-xl sm:text-2xl">{card.icon}</span>
                      <p className="text-sm sm:text-base font-semibold">{card.title}</p>
                    </div>
                    <p className="text-sm text-white/70 mt-2 leading-relaxed">{card.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6 text-center">
          {[
            { label: 'Atendimentos/dia', value: '240+' },
            { label: 'Tempo médio', value: '~6 min' },
            { label: 'Disponibilidade', value: '99.9%' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/10 bg-white/6 px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
            >
              <p className="text-sm text-white/60">{item.label}</p>
              <p className="text-lg sm:text-xl font-semibold text-white mt-1">{item.value}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

