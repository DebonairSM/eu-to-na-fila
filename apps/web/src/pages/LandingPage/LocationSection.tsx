import { useState } from 'react';

const locationInfo = [
  {
    icon: 'location_on',
    title: 'Endereço',
    content: (
      <>
        R. João M Silvano, 281 - Morro Grande
        <br />
        Sangão - SC, 88717-000
        <br />
        <a
          href="https://www.google.com/maps/search/?api=1&query=R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#D4AF37] hover:underline"
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
      <a href="tel:+5548998354097" className="text-[#D4AF37] hover:underline">
        (48) 99835-4097
      </a>
    ),
  },
  {
    icon: 'language',
    title: 'Idiomas',
    content: 'Português & English',
  },
];

export function LocationSection() {
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  return (
    <section id="location" className="section py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-[#1a1a1a]">
      <div className="container mx-auto max-w-7xl">
        <div className="section-header text-center mb-12 sm:mb-16 lg:mb-20">
          <h2 className="section-title font-['Playfair_Display',serif] text-[clamp(2rem,5vw,3.5rem)] font-semibold text-white">
            Localização
          </h2>
        </div>

        {/* Mobile: Stacked layout (info above map) */}
        <div className="lg:hidden space-y-6">
          <div className="space-y-6">
            {locationInfo.map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="material-symbols-outlined text-[#D4AF37] text-2xl flex-shrink-0">
                  {item.icon}
                </span>
                <div>
                  <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-[rgba(255,255,255,0.7)]">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Collapsible map on mobile */}
          <div>
            <button
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className="w-full mb-4 px-4 py-3 bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] rounded-lg text-[#D4AF37] font-medium flex items-center justify-center gap-2 hover:bg-[rgba(212,175,55,0.15)] transition-all min-h-[52px]"
            >
              <span className="material-symbols-outlined">
                {isMapExpanded ? 'expand_less' : 'expand_more'}
              </span>
              {isMapExpanded ? 'Ocultar Mapa' : 'Mostrar Mapa'}
            </button>
            {isMapExpanded && (
              <div className="rounded-xl overflow-hidden border border-[rgba(212,175,55,0.2)]">
                <iframe
                  src="https://www.google.com/maps?q=R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000&output=embed"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="grayscale hover:grayscale-0 transition-all"
                  title="Localização da Barbearia Mineiro"
                />
              </div>
            )}
          </div>
        </div>

        {/* Desktop: 2-column layout (info left, map right) utilizing full width */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-start">
          <div className="space-y-8">
            {locationInfo.map((item) => (
              <div key={item.title} className="flex gap-6">
                <span className="material-symbols-outlined text-[#D4AF37] text-3xl flex-shrink-0">
                  {item.icon}
                </span>
                <div>
                  <h4 className="font-semibold text-white mb-2 text-lg">{item.title}</h4>
                  <p className="text-base text-[rgba(255,255,255,0.7)]">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.2)] shadow-lg">
            <iframe
              src="https://www.google.com/maps?q=R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000&output=embed"
              width="100%"
              height="500"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="grayscale hover:grayscale-0 transition-all duration-300"
              title="Localização da Barbearia Mineiro"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
