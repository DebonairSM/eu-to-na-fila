import { Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';
import { LOGO_URL } from '@/lib/logo';

export function RootAboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-white/5 bg-black sticky top-0 z-50">
        <Container size="2xl" className="py-2 sm:py-2.5">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src={LOGO_URL}
                alt="EuTô NaFila"
                className="h-14 sm:h-16 md:h-20 w-auto object-contain shrink-0"
              />
            </Link>
            <div className="flex items-center gap-8">
              <Link
                to="/projects"
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
              >
                Projetos
              </Link>
              <Link
                to="/about"
                className="text-sm text-white border-b border-white/20 pb-1 font-medium"
              >
                Sobre
              </Link>
              <Link
                to="/contact"
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
              >
                Contato
              </Link>
            </div>
          </div>
        </Container>
      </nav>

      <main className="py-20">
        <Container size="2xl">
        <header className="mb-16">
          <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">Sobre EuToNaFila</h1>
          <p className="text-xl text-gray-400 max-w-2xl leading-relaxed font-light">
            Fila virtual ao vivo para barbearias. Simples, local, em tempo real.
          </p>
        </header>

        <section className="mb-20">
          <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-12">
            <h2 className="text-3xl font-light mb-6">O que fazemos</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p className="text-lg">
                O EuToNaFila é um sistema de fila virtual ao vivo para barbearias. Não é agendamento nem SaaS genérico. Os clientes entram na fila, acompanham em tempo real e são chamados na vez—ficam à vontade enquanto esperam. O dono vê o fluxo em tempo real, tem analytics e uma página pública por barbearia.
              </p>
              <p className="text-lg">
                Focamos em clareza operacional e decisões apoiadas por dados. A IA usa dados ao vivo e histórico para sugerir, por exemplo, quando falta equipe, quando vale divulgar promoção ou em que horário colocar mais um barbeiro. Tudo pensado para quem comanda o dia a dia da barbearia.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-3xl font-light mb-12">Pilares</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Fila ao vivo',
                description: 'Fila virtual em tempo real. Posição, tempo estimado e notificações quando a vez se aproxima.',
              },
              {
                title: 'Controle do fluxo',
                description: 'Veja quantos esperam, picos e baixas. Menos cliente que desiste por incerteza.',
              },
              {
                title: 'Analytics',
                description: 'Fluxo diário, semanal e mensal. Tempo médio de espera, abandono, melhores horários.',
              },
              {
                title: 'IA para decisões',
                description: 'Sugestões baseadas em dados ao vivo e histórico. Ex.: falta de equipe, boa hora para promoção.',
              },
              {
                title: 'Página por barbearia',
                description: 'Cada barbearia tem página pública: site, entrada na fila e divulgação em um lugar.',
              },
              {
                title: 'Feito para barbearias',
                description: 'Do bairro walk-in à barbearia premium. Um sistema, apresentação flexível.',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-xl p-6 hover:border-white/20 hover:bg-white/10 transition-all"
              >
                <h3 className="text-lg font-medium mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <Link
            to="/contact"
            className="inline-block px-8 py-3.5 bg-white text-[#0a0a0a] font-medium rounded-lg hover:bg-gray-100 transition-all text-sm"
          >
            Entre em Contato
          </Link>
        </section>
        </Container>
      </main>

      <footer className="border-t border-white/5 bg-black py-16 mt-24">
        <Container size="2xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={LOGO_URL}
                  alt="EuTô NaFila"
                  className="h-24 w-auto object-contain shrink-0"
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
    </div>
  );
}
