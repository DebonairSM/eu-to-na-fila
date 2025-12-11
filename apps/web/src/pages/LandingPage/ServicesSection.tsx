import { Card, CardContent } from '@/components/ui/card';

const services = [
  {
    icon: 'content_cut',
    name: 'Corte',
    price: '$30',
  },
  {
    icon: 'face_6',
    name: 'Barba',
    price: '$20',
  },
  {
    icon: 'star',
    name: 'Corte + Barba',
    price: '$45',
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="section py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-[#1a1a1a]">
      <div className="container mx-auto max-w-7xl">
        <div className="section-header text-center mb-12 sm:mb-16 lg:mb-20">
          <h2 className="section-title font-['Playfair_Display',serif] text-[clamp(2rem,5vw,3.5rem)] font-semibold text-white">
            Serviços
          </h2>
        </div>

        {/* Mobile: Swipeable cards (single column) */}
        <div className="lg:hidden space-y-4 sm:space-y-6">
          {services.map((service) => (
            <Card 
              key={service.name} 
              className="text-center hover:border-[#D4AF37] transition-all duration-300 bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.1)]"
            >
              <CardContent className="p-6 sm:p-8">
                <span className="material-symbols-outlined text-5xl sm:text-6xl text-[#D4AF37] mb-4 sm:mb-6 block">
                  {service.icon}
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">{service.name}</h3>
                <p className="text-[#D4AF37] text-xl sm:text-2xl font-semibold">{service.price}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop: 3-column grid spanning full width */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6 xl:gap-8 max-w-6xl mx-auto">
          {services.map((service) => (
            <Card 
              key={service.name} 
              className="text-center hover:border-[#D4AF37] hover:shadow-[0_8px_32px_rgba(212,175,55,0.2)] transition-all duration-300 bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.1)]"
            >
              <CardContent className="p-8 xl:p-10">
                <span className="material-symbols-outlined text-6xl xl:text-7xl text-[#D4AF37] mb-6 block">
                  {service.icon}
                </span>
                <h3 className="text-2xl xl:text-3xl font-semibold text-white mb-6">{service.name}</h3>
                <p className="text-[#D4AF37] text-2xl xl:text-3xl font-semibold">{service.price}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
