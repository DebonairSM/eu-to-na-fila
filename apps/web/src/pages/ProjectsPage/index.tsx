import { Link } from 'react-router-dom';
import { CompanyNav } from '@/components/CompanyNav';
import { Container } from '@/components/design-system/Spacing/Container';

export function ProjectsPage() {
  const projects = [
    {
      id: 'mineiro',
      title: 'Barbearia Mineiro',
      description: 'Fila virtual ao vivo em produção. Clientes entram na fila, acompanham a posição em tempo real e voltam na hora do atendimento. Inclui painéis, totem e PWA.',
      technologies: ['React', 'TypeScript', 'Fastify', 'PostgreSQL', 'WebSockets', 'PWA'],
      link: '/mineiro/',
      status: 'Ativo',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />

      <main className="py-16 sm:py-24">
        <Container size="2xl">
          <header className="mb-14">
            <p className="text-sm uppercase tracking-[0.25em] text-[#D4AF37] mb-3">Projetos</p>
            <h1 className="text-4xl sm:text-5xl font-semibold mb-4">Rede EuToNaFila</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Barbearias em produção com fila virtual ao vivo. Acesse o app de cada unidade.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 sm:p-10 hover:border-white/20 hover:bg-white/8 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <h2 className="text-2xl sm:text-3xl font-semibold">{project.title}</h2>
                      <span className="px-3 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-medium uppercase tracking-wider border border-[#D4AF37]/30">
                        {project.status}
                      </span>
                    </div>
                    <p className="text-white/80 text-lg mb-6 leading-relaxed">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {project.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                    <a
                      href={project.link}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-xl hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all text-sm"
                    >
                      Acessar app
                      <span className="material-symbols-outlined text-[#0a0a0a] text-lg">
                        arrow_forward
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/20 text-white font-semibold rounded-xl hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all text-sm"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Voltar ao Início
            </Link>
          </div>
        </Container>
      </main>

      <footer className="border-t border-white/10 bg-[#050c18] py-12 mt-24">
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
