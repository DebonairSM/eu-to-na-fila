import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';

const navLinks = [
  { to: '/projects', label: 'Projetos' },
  { to: '/about', label: 'Sobre' },
  { to: '/contact', label: 'Contato' },
];

function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav className="border-b border-white/5 bg-black sticky top-0 z-50">
      <Container size="2xl">
        <div className="flex items-center justify-between py-4 sm:py-5">
          <Link to="/" className="flex items-center gap-3 group leading-none">
            <img
              src="/logo-eutonafila.png"
              alt="EuTô NaFila"
              className="h-12 w-auto object-contain shrink-0"
            />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <button
            className="md:hidden p-2 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            <span className="material-symbols-outlined text-xl">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-white/5 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm text-gray-400 hover:text-white font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </Container>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black py-16">
      <Container size="2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo-eutonafila.png"
                alt="EuTô NaFila"
                className="h-12 w-auto object-contain shrink-0"
              />
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
              Fila virtual ao vivo para barbearias. Simples, local, em tempo real.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-4 text-sm uppercase tracking-wider text-gray-400">Navegação</h3>
            <nav className="space-y-3">
              <Link to="/" className="block text-gray-500 hover:text-white text-sm transition-colors">
                Início
              </Link>
              <Link to="/projects" className="block text-gray-500 hover:text-white text-sm transition-colors">
                Projetos
              </Link>
              <Link to="/about" className="block text-gray-500 hover:text-white text-sm transition-colors">
                Sobre
              </Link>
              <Link to="/contact" className="block text-gray-500 hover:text-white text-sm transition-colors">
                Contato
              </Link>
            </nav>
          </div>
          <div>
            <h3 className="font-medium mb-4 text-sm uppercase tracking-wider text-gray-400">Empresa</h3>
            <p className="text-gray-500 text-sm">Feito para barbearias</p>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 text-center text-gray-600 text-sm">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <p>&copy; {new Date().getFullYear()} EuToNaFila. Todos os direitos reservados.</p>
            <Link
              to="/company/login"
              className="text-gray-500/60 hover:text-gray-400 transition-colors text-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">lock</span>
              Admin
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}

export function RootHomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav />

      <main>
        {/* 1. Hero: Virtual Line for Barbershops */}
        <section className="relative min-h-[92vh] flex items-start sm:items-center justify-center px-6 pt-10 pb-20 sm:py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
          <div className="relative max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-medium uppercase tracking-wider">
              Fila virtual ao vivo
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-light leading-[1.1] tracking-tight">
              Sua fila de barbearia,
              <br />
              <span className="text-blue-400">longe da calçada.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
              Clientes entram na fila virtual, acompanham em tempo real e são chamados na vez. Ficam à vontade enquanto esperam. Sem aglomeração, sem caos, sem adivinhar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link
                to="/contact"
                className="px-8 py-3.5 bg-white text-[#0a0a0a] font-medium rounded-lg hover:bg-gray-100 transition-all text-sm"
              >
                Fale Conosco
              </Link>
              <Link
                to="/projects"
                className="px-8 py-3.5 border border-white/20 text-white font-medium rounded-lg hover:border-white/40 hover:bg-white/5 transition-all text-sm"
              >
                Ver Projeto
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Problem: Chaos, crowding, lost customers */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-light mb-4 tracking-tight">
                Calçada cheia. Cliente na dúvida.
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                Quem espera não sabe se vale a pena. Quem desiste você nem vê. O movimento entra e sai e ninguém tem clareza.
              </p>
            </div>
          </Container>
        </section>

        {/* 3. Solution: Live virtual queue */}
        <section className="py-16 sm:py-24 bg-white/[0.02] border-t border-white/5">
          <Container size="2xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-light mb-4 tracking-tight">
                Fila virtual em tempo real
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Não é agendamento. Não é SaaS genérico. É fila ao vivo.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { icon: 'schedule', title: 'Fila em tempo real', desc: 'Posição e estimativa de espera ao vivo.' },
                { icon: 'notifications', title: 'Avisos na hora', desc: 'Cliente avisado quando estiver perto da vez.' },
                { icon: 'group_off', title: 'Sem aglomeração', desc: 'Nada de fila na calçada ou caos na porta.' },
              ].map((item) => (
                <div
                  key={item.icon}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 hover:bg-white/[0.07] transition-all"
                >
                  <span className="material-symbols-outlined text-blue-400/80 text-3xl mb-4 block">
                    {item.icon}
                  </span>
                  <h3 className="text-lg font-medium mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* 4. How it works: Join, wait, return */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-light mb-4 tracking-tight">
                Como funciona
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Entra, acompanha, é chamado. Simples.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto">
              {[
                { step: '1', title: 'Entra na fila', desc: 'QR code, link ou totem. O cliente entra em segundos.' },
                { step: '2', title: 'Espera com flexibilidade', desc: 'Acompanha posição e tempo ao vivo. Fica à vontade—café, sinuca, ou onde preferir.' },
                { step: '3', title: 'É chamado na vez', desc: 'Aviso quando estiver perto. Aparece na hora do atendimento.' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl font-semibold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-medium mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* 5. Owner benefits: Control + analytics */}
        <section className="py-16 sm:py-24 bg-white/[0.02] border-t border-white/5">
          <Container size="2xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-light mb-4 tracking-tight">
                Para o dono da barbearia
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Controle do fluxo e clareza operacional.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 hover:border-white/20 transition-all">
                <span className="material-symbols-outlined text-blue-400/80 text-3xl mb-4 block">
                  analytics
                </span>
                <h3 className="text-xl font-medium mb-3">Controle do fluxo</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Veja quantos estão esperando em tempo real. Entenda picos e baixas. Menos cliente que desiste por incerteza.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 hover:border-white/20 transition-all">
                <span className="material-symbols-outlined text-blue-400/80 text-3xl mb-4 block">
                  bar_chart
                </span>
                <h3 className="text-xl font-medium mb-3">Painel de dados</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Fluxo diário, semanal e mensal. Tempo médio de espera, abandono, melhores horários. Dados para decidir, não para enfeite.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* 6. AI insights */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-light mb-4 tracking-tight">
                IA que ajuda a decidir
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                Baseada em dados ao vivo e histórico. Um assistente para decisões do dia a dia.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 sm:p-10 max-w-3xl mx-auto">
              <ul className="space-y-4 text-gray-300 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400/80 shrink-0 mt-0.5">lightbulb</span>
                  <span>“Falta gente para este horário.”</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400/80 shrink-0 mt-0.5">lightbulb</span>
                  <span>“Boa hora para divulgar uma promoção.”</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400/80 shrink-0 mt-0.5">lightbulb</span>
                  <span>“Vale colocar mais um barbeiro na sexta às 17h.”</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400/80 shrink-0 mt-0.5">lightbulb</span>
                  <span>“O tempo de espera hoje está acima da média.”</span>
                </li>
              </ul>
              <p className="mt-6 text-gray-500 text-sm">
                Sem chatbot. Sem hype. Só inteligência útil.
              </p>
            </div>
          </Container>
        </section>

        {/* 7. Bonus: Free custom barbershop website */}
        <section className="py-16 sm:py-24 bg-white/[0.02] border-t border-white/5">
          <Container size="2xl">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-8 sm:p-12 max-w-3xl mx-auto text-center">
              <span className="material-symbols-outlined text-blue-400 text-4xl mb-4 block">
                public
              </span>
              <h2 className="text-2xl sm:text-3xl font-medium mb-4">
                Não é só fila. É sua vitrine.
              </h2>
              <p className="text-gray-400 mb-6 max-w-xl mx-auto">
                Cada barbearia ganha uma <strong className="text-white">página pública</strong> dentro do EuToNaFila: site, entrada na fila e funil de divulgação em um só lugar. Quem não quer montar site do zero, não precisa.
              </p>
              <p className="text-gray-500 text-sm">
                Você não compra só um sistema de fila. Você ganha uma loja digital.
              </p>
            </div>
          </Container>
        </section>

        {/* 8. Target: Barbershops only */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-light mb-4 tracking-tight">
                Feito para barbearias
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                Do bairro que vive de walk-in à barbearia premium com totem na recepção. Um sistema, apresentação flexível.
              </p>
              <p className="text-blue-400/90 font-medium">
                Se sua barbearia corre no instinto ou no iPad, o EuToNaFila se encaixa.
              </p>
            </div>
          </Container>
        </section>

        {/* 9. CTA */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 sm:p-12 max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-medium mb-4">
                Pronto para tirar a fila da calçada?
              </h2>
              <p className="text-gray-400 mb-8">
                Fale conosco e veja como colocar a fila virtual na sua barbearia.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/contact"
                  className="px-8 py-3.5 bg-white text-[#0a0a0a] font-medium rounded-lg hover:bg-gray-100 transition-all text-sm"
                >
                  Fale Conosco
                </Link>
                <Link
                  to="/projects"
                  className="px-8 py-3.5 border border-white/20 text-white font-medium rounded-lg hover:border-white/40 hover:bg-white/5 transition-all text-sm"
                >
                  Ver Projeto ao Vivo
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
}
