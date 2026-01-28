import { Link } from 'react-router-dom';
import { CompanyNav } from '@/components/CompanyNav';
import { Container } from '@/components/design-system/Spacing/Container';

export function CompanyHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />

      <main className="w-full">
        <section className="relative min-h-[90vh] flex items-center justify-center px-4 sm:px-6 py-20 sm:py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-transparent" />
          <Container size="2xl" className="relative text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/12 text-[#8ad6b0] text-xs font-semibold uppercase tracking-[0.28em]">
              Fila virtual ao vivo • Só barbearias
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight max-w-5xl mx-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              Fila virtual ao vivo para barbearias
            </h1>
            <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Sua fila da barbearia, longe da calçada. Clientes entram na fila, saem, vivem a vida e voltam na hora.
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

        <section id="problema" className="py-16 sm:py-24">
          <Container size="2xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4">
                Fila na calçada não escala
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Aglomeração na porta, cliente que desiste por incerteza, caos nos horários de pico. Quem espera não sabe quando vai ser atendido — e você perde gente que poderia voltar.
              </p>
            </div>
          </Container>
        </section>

        <section id="solucao" className="py-16 sm:py-24">
          <Container size="2xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4">
                Solução: fila virtual ao vivo
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Uma fila em tempo real. O cliente entra, espera longe e volta na vez. Simples e prático.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: 'schedule', title: 'Fila em tempo real', description: 'Virtual queue atualizada ao vivo. Posição e tempo de espera sempre visíveis.' },
                { icon: 'timeline', title: 'Posição ao vivo', description: 'Cliente acompanha onde está na fila e quando deve voltar.' },
                { icon: 'timer', title: 'Estimativa de espera', description: 'Previsão de tempo baseada no fluxo real da barbearia.' },
                { icon: 'notifications', title: 'Aviso quando chega a vez', description: 'Notificação antes de ser chamado. Menos abandono, menos ansiedade.' },
                { icon: 'groups_2', title: 'Sem aglomeração', description: 'Nada de fila na calçada. Cliente espera onde quiser e volta na hora.' },
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
          </Container>
        </section>

        <section id="como-funciona" className="py-16 sm:py-24">
          <Container size="2xl">
            <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-2xl p-8 sm:p-12 lg:p-16">
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-[#0f3d2e]/20 via-[#D4AF37]/10 to-[#0e1f3d]/20 blur-3xl" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-semibold mb-6 text-center">
                  Como funciona
                </h2>
                <p className="text-center text-white/70 mb-10 max-w-2xl mx-auto">
                  Entrar, sair, voltar na vez. O fluxo é simples.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { step: '01', title: 'Cliente entra na fila', description: 'Acessa por link ou QR code. Informa nome e serviço. Entra na fila em segundos.' },
                    { step: '02', title: 'Espera longe, acompanha em tempo real', description: 'Pode ir embora. Vê posição e tempo estimado no celular. Recebe aviso quando estiver perto da vez.' },
                    { step: '03', title: 'Volta na hora', description: 'Quando chega a vez, volta e é atendido. Sem fila na calçada, sem dúvida.' },
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
          </Container>
        </section>

        <section id="beneficios-dono" className="py-16 sm:py-24">
          <Container size="2xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4">
                Para o dono da barbearia
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Clareza operacional, não dados por dados.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 hover:bg-white/8 transition-all">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-[#0a0a0a] text-3xl">insights</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Controle de fluxo</h3>
                <p className="text-white/70 leading-relaxed mb-4">
                  Veja quantas pessoas estão na fila em tempo real. Entenda picos e horários vazios. Reduza desistências por incerteza — o cliente sabe quando voltar.
                </p>
                <ul className="text-white/80 text-sm space-y-2">
                  <li>• Fila ao vivo na palma da mão</li>
                  <li>• Picos e vazios por período</li>
                  <li>• Menos cliente que vai embora sem saber</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 hover:bg-white/8 transition-all">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-[#0a0a0a] text-3xl">analytics</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Painel e analytics</h3>
                <p className="text-white/70 leading-relaxed mb-4">
                  Fluxo diário, semanal e mensal. Tempo médio de espera, taxa de desistência, melhores janelas por barbeiro. Tudo para você decidir com base no que realmente acontece.
                </p>
                <ul className="text-white/80 text-sm space-y-2">
                  <li>• Fluxo por dia / semana / mês</li>
                  <li>• Tempo médio de espera e desistências</li>
                  <li>• Performance por barbeiro e horário</li>
                </ul>
              </div>
            </div>
          </Container>
        </section>

        <section id="ai" className="py-16 sm:py-24">
          <Container size="2xl">
            <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-2xl p-8 sm:p-12 lg:p-16">
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-[#0f3d2e]/20 via-[#D4AF37]/10 to-[#0e1f3d]/20 blur-3xl" />
              <div className="relative text-center">
                <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
                  Um assistente para decisões da barbearia
                </h2>
                <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
                  Usamos dados ao vivo e históricos para sugerir ações concretas. Nada de chatbot nem hype — só inteligência quieta.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                  {[
                    'Você está com pouca equipe neste horário',
                    'Bom momento para postar uma promo',
                    'Vale colocar mais um barbeiro nas sextas às 17h',
                    'O tempo de espera hoje está acima da média',
                  ].map((example, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/90 text-sm"
                    >
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>

        <section id="bonus-site" className="py-16 sm:py-24">
          <Container size="2xl">
            <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/10 to-[#0f3d2e]/20 p-8 sm:p-12 lg:p-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
                  Não é só fila. Você ganha uma vitrine digital.
                </h2>
                <p className="text-lg text-white/80 max-w-2xl mx-auto">
                  Cada barbearia tem uma <strong>página pública</strong> dentro da EuToNaFila: site oficial, página de entrada na fila e canal de divulgação. Você não está só comprando fila — está ganhando uma loja digital. Menos fricção para quem não quer montar site.
                </p>
              </div>
              <ul className="text-white/80 max-w-xl mx-auto space-y-2 text-sm">
                <li>• Página customizada por barbearia</li>
                <li>• Serve como site + fila + marketing</li>
                <li>• Tudo em um lugar, feito para barbearias</li>
              </ul>
            </div>
          </Container>
        </section>

        <section id="prova-social" className="py-16 sm:py-24">
          <Container size="2xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
                Resultados que falam
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto mb-6">
                Se sua barbearia vive de improviso ou de iPad, a EuToNaFila se adapta.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
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
          </Container>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/10 to-[#0f3d2e]/20 p-8 sm:p-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
              Pronto para levar sua fila para fora da calçada?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Fale conosco e veja como a fila virtual ao vivo se encaixa na sua barbearia.
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
        <Container size="2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-extrabold text-lg">
                  E
                </div>
                <div>
                  <p className="text-sm text-white/70">EuToNaFila</p>
                  <p className="text-lg font-semibold">Fila virtual ao vivo para barbearias</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">
                Sua fila da barbearia, longe da calçada. Simples, local, tempo real.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Links</h3>
              <nav className="space-y-2">
                <Link to="/" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  Home
                </Link>
                <Link to="/about" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  Sobre
                </Link>
                <Link to="/network" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  Barbearias
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
