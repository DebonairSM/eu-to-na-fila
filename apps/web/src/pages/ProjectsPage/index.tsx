import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';
import { RootSiteNav } from '@/components/RootSiteNav';
import { useLocale } from '@/contexts/LocaleContext';
import { LOGO_URL } from '@/lib/logo';
import { api } from '@/lib/api';

const DEFAULT_TECHNOLOGIES = ['React', 'TypeScript', 'Fastify', 'PostgreSQL', 'WebSockets', 'PWA'];

export function ProjectsPage() {
  const { t } = useLocale();
  const location = useLocation();
  const [projects, setProjects] = useState<Array<{ id: number; slug: string; name: string; path: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : t('projects.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getProjects()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('projects.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, t]);

  useEffect(() => {
    const onFocus = () => fetchProjects();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchProjects]);

  const projectCards = projects.map((p) => ({
    id: String(p.id),
    title: p.name,
    description: t('projects.defaultDescription'),
    technologies: DEFAULT_TECHNOLOGIES,
    link: p.path.endsWith('/') ? p.path : `${p.path}/`,
    status: 'Ativo' as const,
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <RootSiteNav />

      <main className="py-20">
        <Container size="2xl">
        <header className="mb-16">
          <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">Projetos</h1>
          <p className="text-xl text-gray-400 max-w-2xl leading-relaxed font-light">
            O EuToNaFila em produção. Acesse a fila virtual e o app.
          </p>
        </header>

        {loading && (
          <div className="text-center py-12 text-gray-400">Carregando projetos...</div>
        )}
        {error && (
          <div className="text-center py-12 text-red-400">{error}</div>
        )}
        {!loading && !error && projectCards.length === 0 && (
          <div className="text-center py-12 text-gray-400">{t('projects.noProjects')}</div>
        )}
        <div className="grid grid-cols-1 gap-6">
            {projectCards.map((project) => (
            <div
              key={project.id}
              className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-10 hover:border-white/20 hover:bg-white/10 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-3xl font-light">{project.title}</h2>
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium uppercase tracking-wider border border-blue-500/30">
                      {project.status}
                    </span>
                  </div>
                  <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <a
                    href={project.link}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0a0a0a] font-medium rounded-lg hover:bg-gray-100 transition-all text-sm"
                  >
                    Ver Projeto
                    <span className="material-symbols-outlined text-[#0a0a0a] text-lg">
                      arrow_forward
                    </span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white font-medium rounded-lg hover:border-white/40 hover:bg-white/5 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Voltar ao Início
          </Link>
        </div>
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
