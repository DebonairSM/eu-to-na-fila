import { Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';
import { RootSiteNav } from '@/components/RootSiteNav';

export function RootContactPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <RootSiteNav />

      <main className="py-20">
        <Container size="2xl">
        <header className="mb-16 text-center">
          <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">Entre em Contato</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
            Quer levar a fila virtual para sua barbearia? Fale conosco.
          </p>
        </header>

        <section className="mb-16">
          <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-12">
            <h2 className="text-3xl font-light mb-8">Entre em Contato</h2>
            <p className="text-lg text-gray-300 leading-relaxed mb-10">
              Barbearia com fila na calçada ou cliente que desiste por incerteza? O EuToNaFila resolve. Escreva e conversamos.
            </p>
            
            <div className="space-y-8">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-gray-300 text-xl">email</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Email</h3>
                  <p className="text-gray-400 mb-1">Para consultas e discussões de projetos</p>
                  <p className="text-blue-400">eutonafila@gmail.com</p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-gray-300 text-xl">business</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-3">Serviços</h3>
                  <div className="space-y-1.5 text-gray-400">
                    <p>Fila virtual ao vivo para barbearias</p>
                    <p>Painel, analytics e IA para decisões</p>
                    <p>Página pública por barbearia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="text-center">
          <Link
            to="/projects"
            className="inline-block px-8 py-3.5 border border-white/20 text-white font-medium rounded-lg hover:border-white/40 hover:bg-white/5 transition-all text-sm"
          >
            Ver Nossos Projetos
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
