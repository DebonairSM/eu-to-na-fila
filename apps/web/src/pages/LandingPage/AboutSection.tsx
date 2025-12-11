const features = [
  { icon: 'schedule', text: 'Fila online' },
  { icon: 'workspace_premium', text: 'Produtos premium' },
  { icon: 'groups', text: 'Equipe experiente' },
  { icon: 'local_parking', text: 'Estacionamento fácil' },
];

export function AboutSection() {
  return (
    <section id="about" className="section py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl">
        {/* Mobile: Single column */}
        <div className="lg:hidden space-y-8">
          <div>
            <h3 className="font-['Playfair_Display',serif] text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-white mb-4">
              Sobre
            </h3>
            <p className="text-[rgba(255,255,255,0.7)] mb-8 leading-relaxed">
              Barbearia em Sangão, SC.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature) => (
                <div key={feature.text} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
                    {feature.icon}
                  </span>
                  <span className="text-sm text-[rgba(255,255,255,0.8)]">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="aspect-[4/5] bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)] rounded-xl border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
            <span className="material-symbols-outlined text-8xl text-[#D4AF37]/30">
              storefront
            </span>
          </div>
        </div>

        {/* Desktop: 2-column layout (text + image side-by-side) */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
          <div>
            <h3 className="font-['Playfair_Display',serif] text-[clamp(2.5rem,4vw,3.5rem)] font-semibold text-white mb-6">
              Sobre
            </h3>
            <p className="text-lg text-[rgba(255,255,255,0.7)] mb-10 leading-relaxed max-w-[500px]">
              Barbearia em Sangão, SC.
            </p>
            <div className="grid grid-cols-2 gap-6">
              {features.map((feature) => (
                <div key={feature.text} className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-[#D4AF37] text-3xl">
                    {feature.icon}
                  </span>
                  <span className="text-base text-[rgba(255,255,255,0.8)]">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="aspect-[4/5] bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)] rounded-2xl border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
            <span className="material-symbols-outlined text-[12rem] text-[#D4AF37]/30">
              storefront
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
