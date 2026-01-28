import { Link } from 'react-router-dom';
import { CompanyNav } from '@/components/CompanyNav';
import { Container } from '@/components/design-system/Spacing/Container';

export function CompanyHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />

      <main className="w-full">
        {/* 1. Hero: Virtual Line for Barbershops */}
        <section
          id="main-content"
          className="relative min-h-[90vh] flex items-center justify-center px-4 sm:px-6 py-20 sm:py-32"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-transparent" />
          <Container size="2xl" className="relative text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/12 text-[#8ad6b0] text-xs font-semibold uppercase tracking-[0.28em]">
              Fila virtual ao vivo • Barbearias
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight max-w-5xl mx-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              Sua fila da barbearia,
              <br />
              <span className="text-[#D4AF37]">livre da calçada.</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Clientes entram na fila virtual, saem, vivem a vida e voltam na hora do atendimento. Sem aglomeração, sem caos, sem chute.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/contact"
                className="px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-xl hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] transition-all hover:-translate-y-0.5"
              >
                Fale Conosco
              </Link>
              <a
                href="#como-funciona"
                className="px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-xl hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all"
              >
                Como Funciona
              </a>
            </div>
          </Container>
        </section>

        {/* 2. Problem: Chaos, crowding, lost customers */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-4">
                Filas físicas custam caro
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Aglomeração na porta, clientes desistem sem avisar, horário de pico vira palpite. Você perde atendimentos e controle.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: 'groups', label: 'Aglomeração na calçada' },
                { icon: 'exit_to_app', label: 'Cliente desiste e some' },
                { icon: 'schedule', label: 'Ninguém sabe quanto esperar' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/5 p-6 text-center"
                >
                  <span className="material-symbols-outlined text-[#D4AF37]/80 text-4xl mb-3 block">
                    {item.icon}
                  </span>
                  <p className="text-white/80 font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* 3. Solution: Live virtual queue */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-semibold mb-6">
                  Fila virtual ao vivo
                </h2>
                <p className="text-lg text-white/80 mb-8 leading-relaxed">
                  Não é agendamento. Não é software genérico. É a sua fila, em tempo real: o cliente entra, acompanha a posição, recebe aviso quando estiver perto da vez e volta na hora.
                </p>
                <ul className="space-y-4">
                  {[
                    'Fila em tempo real',
                    'Posição ao vivo',
                    'Estimativa de espera',
                    'Notificação quando a vez se aproxima',
                    'Sem tumulto, sem caos, sem adivinhar',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/85">
                      <span className="material-symbols-outlined text-[#8ad6b0] text-xl">check_circle</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 lg:p-10">
                <div className="space-y-6">
                  {[
                    { step: '1', title: 'Cliente entra', desc: 'QR, link ou totem.' },
                    { step: '2', title: 'Espera longe', desc: 'Vê posição e tempo estimado.' },
                    { step: '3', title: 'Volta na hora', desc: 'Aviso quando a vez chega.' },
                  ].map((s) => (
                    <div key={s.step} className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-bold shrink-0">
                        {s.step}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{s.title}</h3>
                        <p className="text-white/70 text-sm">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* 4. How It Works: Join, wait, return */}
        <section id="como-funciona" className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
                Como funciona
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Entrar, esperar, voltar. Simples.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { n: '01', title: 'Entra na fila', desc: 'Cliente escaneia QR ou acessa o link. Informa nome e serviço.' },
                { n: '02', title: 'Espera à vontade', desc: 'Acompanha posição e tempo estimado. Pode sair e voltar.' },
                { n: '03', title: 'Volta na vez', desc: 'Recebe aviso, retorna e é atendido.' },
              ].map((item) => (
                <div key={item.n} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] text-2xl font-bold mb-4">
                    {item.n}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-white/70">{item.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* 5. Owner Benefits: Influx control + Analytics */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
                Para o dono da barbearia
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Controle do fluxo e clareza operacional.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#0a0a0a] text-3xl">insights</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Controle de fluxo</h3>
                <ul className="space-y-2 text-white/75 text-sm">
                  <li>Quantos estão esperando em tempo real</li>
                  <li>Horários de pico e horários vazios</li>
                  <li>Menos desistências por incerteza</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#0a0a0a] text-3xl">analytics</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Painel de analytics</h3>
                <ul className="space-y-2 text-white/75 text-sm">
                  <li>Fluxo diário, semanal e mensal</li>
                  <li>Tempo médio de espera e desistências</li>
                  <li>Janelas de melhor desempenho por barbeiro</li>
                </ul>
              </div>
            </div>
          </Container>
        </section>

        {/* 6. AI Insights */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-2xl p-8 sm:p-12 lg:p-16">
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-[#0f3d2e]/20 via-[#D4AF37]/10 to-[#0e1f3d]/20 blur-3xl" />
              <div className="relative max-w-3xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/12 text-[#8ad6b0] text-xs font-semibold uppercase tracking-wider mb-6">
                  IA com base em dados reais
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
                  Um assistente para decisões da barbearia
                </h2>
                <p className="text-white/80 mb-8 leading-relaxed">
                  Usamos IA a partir de dados ao vivo e históricos, não dicas genéricas. Exemplos: “você está com pouca equipe neste horário”, “bom momento para postar promo”, “coloque mais um barbeiro sexta às 17h”, “a espera hoje está acima da média”.
                </p>
                <p className="text-white/60 text-sm">
                  Sem chatbot. Sem hype. Inteligência discreta.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* 7. Bonus: Free custom barbershop website */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-semibold mb-6">
                  Não é só fila. É sua vitrine digital.
                </h2>
                <p className="text-lg text-white/80 mb-6 leading-relaxed">
                  Cada barbearia ganha uma <strong className="text-white">página pública</strong> dentro do EuToNaFila: seção com sua marca, usada como site oficial, página de entrada na fila e funil de divulgação.
                </p>
                <p className="text-white/70">
                  Menos atrito para quem não quer montar site. Você não compra só um sistema de fila; você ganha uma vitrine digital.
                </p>
              </div>
              <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-8">
                <ul className="space-y-4">
                  {['Página customizada', 'Entrada na fila integrada', 'Divulgação e marketing'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/90">
                      <span className="material-symbols-outlined text-[#D4AF37]">done</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>

        {/* 8. Target: Barbershops only + Social proof */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
                Feito para barbearias
              </h2>
              <p className="text-lg text-white/80 max-w-2xl mx-auto mb-2">
                De bairro, walk-in, à alta rotatividade ou mais tech: um sistema, apresentação flexível.
              </p>
              <p className="text-[#D4AF37] font-medium">
                Se sua barbearia vive de instinto ou de iPad, o EuToNaFila se encaixa.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { value: '240+', label: 'Atendimentos/dia', icon: 'trending_up' },
                { value: '~6 min', label: 'Tempo médio de espera', icon: 'schedule' },
                { value: '99,9%', label: 'Disponibilidade', icon: 'check_circle' },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center"
                >
                  <span className="material-symbols-outlined text-[#D4AF37] text-4xl mb-4 block">
                    {stat.icon}
                  </span>
                  <p className="text-3xl sm:text-4xl font-bold mb-2">{stat.value}</p>
                  <p className="text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* 9. CTA */}
        <section className="py-16 sm:py-24 border-t border-white/5">
          <Container size="2xl">
            <div className="max-w-3xl mx-auto rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/10 to-[#0f3d2e]/20 p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
                Pronto para tirar sua fila da calçada?
              </h2>
              <p className="text-lg text-white/80 mb-8">
                Fila virtual ao vivo, analytics e vitrine digital. Tudo pensado para barbearias.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/contact"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-xl hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] transition-all hover:-translate-y-0.5"
                >
                  Fale Conosco
                </Link>
                <Link
                  to="/network"
                  className="inline-block px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-xl hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all"
                >
                  Ver barbearias na rede
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#050c18] py-12">
        <Container size="2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-extrabold text-lg">
                  E
                </div>
                <div>
                  <p className="text-sm text-white/70">EuToNaFila</p>
                  <p className="text-lg font-semibold">Fila virtual para barbearias</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">
                Fila ao vivo, simples e prática. Feito para barbearias.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Links</h3>
              <nav className="space-y-2">
                <Link to="/" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  Início
                </Link>
                <Link to="/projects" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  Projetos
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
                to="/company/login"
                className="text-white/40 hover:text-white/60 transition-colors text-xs flex items-center gap-1"
                data-testid="footer-login-link"
              >
                <span className="material-symbols-outlined text-sm">lock</span>
                Admin
              </Link>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
