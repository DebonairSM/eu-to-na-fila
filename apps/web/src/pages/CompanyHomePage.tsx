import { Link } from 'react-router-dom';
import { CompanyNav } from '@/components/CompanyNav';

export function CompanyHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />

      <main className="w-full">
        <section className="relative min-h-[90vh] flex items-center justify-center px-4 sm:px-6 py-20 sm:py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-transparent" />
          <div className="relative max-w-6xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/12 text-[#8ad6b0] text-xs font-semibold uppercase tracking-[0.28em]">
              Virtual lines • Florianópolis, SC
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight max-w-5xl mx-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              Filas Virtuais Premium
            </h1>
            <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Entrada rápida, presença clara, acompanhamento ao vivo. Transforme a experiência de espera do seu negócio.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/contact"
                className="px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-xl hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] transition-all hover:-translate-y-0.5"
              >
                Fale Conosco
              </Link>
              <Link
                to="/about"
                className="px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-xl hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all"
              >
                Saiba Mais
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4">
              Por que escolher EuToNaFila?
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Solução completa para gerenciamento de filas virtuais
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: 'qr_code_scanner',
                title: 'Entrada Instantânea',
                description: 'QR code, link compartilhável ou totem. Clientes entram na fila em segundos.',
              },
              {
                icon: 'timeline',
                title: 'Painel ao Vivo',
                description: 'Estimativas de tempo em tempo real. Clientes acompanham sua posição na fila.',
              },
              {
                icon: 'analytics',
                title: 'Analytics Completo',
                description: 'Insights detalhados sobre tráfego, horários de pico e desempenho da equipe.',
              },
              {
                icon: 'groups',
                title: 'Gestão de Equipe',
                description: 'Controle total sobre barbeiros, serviços e atendimentos em andamento.',
              },
              {
                icon: 'notifications',
                title: 'Notificações Inteligentes',
                description: 'Avisos automáticos quando é a vez do cliente, reduzindo abandono.',
              },
              {
                icon: 'security',
                title: 'Seguro e Confiável',
                description: '99.9% de disponibilidade. Dados protegidos e backup automático.',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:bg-white/8 transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#0a0a0a] text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-2xl p-8 sm:p-12 lg:p-16">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-[#0f3d2e]/20 via-[#D4AF37]/10 to-[#0e1f3d]/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-semibold mb-6 text-center">
                Como Funciona
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    step: '01',
                    title: 'Cliente Entra na Fila',
                    description: 'Escaneia QR code ou acessa link. Informa nome e escolhe serviço.',
                  },
                  {
                    step: '02',
                    title: 'Acompanha em Tempo Real',
                    description: 'Vê posição na fila, tempo estimado e recebe notificações.',
                  },
                  {
                    step: '03',
                    title: 'Atendimento',
                    description: 'Quando chega a vez, é chamado e atendido pelo profissional.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] text-2xl font-bold mb-4">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-white/70">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
              Resultados que Falam
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: 'Atendimentos/dia', value: '240+', icon: 'trending_up' },
              { label: 'Tempo médio de espera', value: '~6 min', icon: 'schedule' },
              { label: 'Disponibilidade', value: '99.9%', icon: 'check_circle' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center hover:bg-white/8 transition-all"
              >
                <span className="material-symbols-outlined text-[#D4AF37] text-4xl mb-4 block">
                  {stat.icon}
                </span>
                <p className="text-3xl sm:text-4xl font-bold mb-2">{stat.value}</p>
                <p className="text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/10 to-[#0f3d2e]/20 p-8 sm:p-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
              Pronto para Transformar sua Fila?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Entre em contato e descubra como podemos otimizar a experiência dos seus clientes.
            </p>
            <Link
              to="/contact"
              className="inline-block px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-xl hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] transition-all hover:-translate-y-0.5"
            >
              Fale Conosco Agora
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#050c18] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-extrabold text-lg">
                  E
                </div>
                <div>
                  <p className="text-sm text-white/70">EuToNaFila</p>
                  <p className="text-lg font-semibold">Virtual Line Software</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">
                Solução premium para gerenciamento de filas virtuais.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Links</h3>
              <nav className="space-y-2">
                <Link to="/home" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  Home
                </Link>
                <Link to="/about" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  Sobre
                </Link>
                <Link to="/contact" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  Contato
                </Link>
              </nav>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contato</h3>
              <p className="text-white/70 text-sm mb-2">Florianópolis, SC</p>
              <Link
                to="/contact"
                className="inline-block mt-4 px-6 py-2 border border-white/20 text-white rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all text-sm"
              >
                Entre em Contato
              </Link>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 text-center text-white/50 text-sm">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <p>&copy; {new Date().getFullYear()} EuToNaFila. Todos os direitos reservados.</p>
              <Link
                to="/login"
                className="text-white/40 hover:text-white/60 transition-colors text-xs flex items-center gap-1"
                data-testid="footer-login-link"
              >
                <span className="material-symbols-outlined text-sm">lock</span>
                Admin
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

