import { Link } from 'react-router-dom';

export function ProjectsPage() {
  const projects = [
    {
      id: 'eu-to-na-fila',
      title: 'EuToNaFila Queue Management',
      description: 'A comprehensive queue management system for barbershops and service businesses. Features real-time queue tracking, staff management, analytics, and PWA support for tablet kiosks.',
      technologies: ['React', 'TypeScript', 'Fastify', 'PostgreSQL', 'WebSockets', 'PWA'],
      link: '/mineiro/',
      status: 'Active',
    },
  ];

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
                className="text-sm text-white border-b border-white/20 pb-1 font-medium"
              >
                Projects
              </Link>
              <Link
                to="/about"
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <header className="mb-16">
          <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">Projects</h1>
          <p className="text-xl text-gray-400 max-w-2xl leading-relaxed font-light">
            Explore our portfolio of software solutions and applications.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {projects.map((project) => (
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
                    View Project
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
            Back to Home
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/5 bg-[#0a0a0a] py-16 mt-24">
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
                Building intelligent software solutions for companies seeking to improve effectiveness and drive growth.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-4 text-sm uppercase tracking-wider text-gray-400">Navigation</h3>
              <nav className="space-y-3">
                <Link to="/" className="block text-gray-500 hover:text-white text-sm transition-colors">
                  Home
                </Link>
                <Link to="/projects" className="block text-gray-500 hover:text-white text-sm transition-colors">
                  Projects
                </Link>
                <Link to="/about" className="block text-gray-500 hover:text-white text-sm transition-colors">
                  About
                </Link>
                <Link to="/contact" className="block text-gray-500 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </nav>
            </div>
            <div>
              <h3 className="font-medium mb-4 text-sm uppercase tracking-wider text-gray-400">Company</h3>
              <p className="text-gray-500 text-sm mb-2">AI Software Development</p>
              <p className="text-gray-600 text-sm">
                Focused on building effective solutions
              </p>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 text-center text-gray-600 text-sm">
            <p>&copy; {new Date().getFullYear()} EuToNaFila. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
