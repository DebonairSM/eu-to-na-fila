import { Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';

export function RootAboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <Container size="2xl" className="py-5">
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
            Construímos soluções de software sofisticadas que ajudam empresas a melhorar a eficácia e alcançar seus objetivos.
          </p>
        </header>

        <section className="mb-20">
          <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-12">
            <h2 className="text-3xl font-light mb-6">Nossa Missão</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p className="text-lg">
                EuToNaFila é uma empresa de desenvolvimento de software focada em criar soluções inteligentes que ajudam empresas a melhorar sua eficácia. Combinamos tecnologia avançada com insights práticos de negócios para entregar software que faz uma diferença significativa.
              </p>
              <p className="text-lg">
                Nossa abordagem está centrada em entender as necessidades do negócio e construir soluções que são tecnicamente excelentes e genuinamente úteis. Buscamos capacitar empresas com ferramentas que agilizam operações, otimizam fluxos de trabalho e impulsionam o crescimento sustentável.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-3xl font-light mb-12">O Que Fazemos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Soluções com IA',
                description: 'Aproveite a inteligência artificial para automatizar processos, obter insights e tomar decisões baseadas em dados.',
              },
              {
                title: 'Melhorar Eficácia',
                description: 'Otimize fluxos de trabalho e operações para aumentar a produtividade e reduzir custos operacionais.',
              },
              {
                title: 'Desenvolvimento Personalizado',
                description: 'Soluções de software sob medida projetadas para atender às necessidades e requisitos específicos do seu negócio.',
              },
              {
                title: 'Análise de Dados',
                description: 'Transforme dados brutos em insights acionáveis que impulsionam o crescimento e a otimização do negócio.',
              },
              {
                title: 'Foco em Performance',
                description: 'Aplicações de alto desempenho construídas para escala, confiabilidade e experiência do usuário otimizada.',
              },
              {
                title: 'Pronto para Empresas',
                description: 'Soluções seguras e escaláveis que atendem aos padrões empresariais e requisitos de conformidade.',
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

      <footer className="border-t border-white/5 bg-[#0a0a0a] py-16 mt-24">
        <Container size="2xl">
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
            <p>&copy; {new Date().getFullYear()} EuToNaFila. Todos os direitos reservados.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
