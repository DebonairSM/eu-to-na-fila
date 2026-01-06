import { Link } from 'react-router-dom';

export function RootHomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm group-hover:from-blue-400 group-hover:to-indigo-500 transition-all">
                E
              </div>
              <span className="text-lg font-medium tracking-tight">EuToNaFila</span>
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
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
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
        </div>
      </nav>

      <main className="w-full">
        <section className="relative min-h-[92vh] flex items-center justify-center px-6 py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
          <div className="relative max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-medium uppercase tracking-wider">
              Soluções de Software com IA
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-light leading-[1.1] tracking-tight">
              Software Inteligente
              <br />
              <span className="text-blue-400">para Empresas Modernas</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
              Construímos soluções de software sofisticadas que ajudam empresas a melhorar a eficácia, otimizar operações e alcançar seus objetivos.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link
                to="/projects"
                className="px-8 py-3.5 bg-white text-[#0a0a0a] font-medium rounded-lg hover:bg-gray-100 transition-all text-sm"
              >
                Ver Nossos Projetos
              </Link>
              <Link
                to="/contact"
                className="px-8 py-3.5 border border-white/20 text-white font-medium rounded-lg hover:border-white/40 hover:bg-white/5 transition-all text-sm"
              >
                Entre em Contato
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-[#0a0a0a] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  E
                </div>
                <span className="text-lg font-medium">EuToNaFila</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                Construindo soluções de software inteligentes para empresas que buscam melhorar a eficácia e impulsionar o crescimento.
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
              <p className="text-gray-500 text-sm mb-2">Desenvolvimento de Software com IA</p>
              <p className="text-gray-600 text-sm">
                Focados em construir soluções eficazes
              </p>
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
        </div>
      </footer>
    </div>
  );
}
