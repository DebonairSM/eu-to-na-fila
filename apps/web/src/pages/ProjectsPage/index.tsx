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
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <nav className="border-b border-white/10 bg-[#050c18]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-extrabold text-lg">
                E
              </div>
              <span className="text-xl font-semibold">EuToNaFila</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                to="/projects"
                className="text-[#D4AF37] border-b-2 border-[#D4AF37] pb-1 text-sm font-medium"
              >
                Projects
              </Link>
              <Link
                to="/about"
                className="text-white/70 hover:text-[#D4AF37] transition-colors text-sm font-medium"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="text-white/70 hover:text-[#D4AF37] transition-colors text-sm font-medium"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-semibold mb-4">Projects</h1>
          <p className="text-lg text-white/70 max-w-2xl">
            Explore our portfolio of software solutions and applications.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 hover:bg-white/8 transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-2xl sm:text-3xl font-semibold">{project.title}</h2>
                    <span className="px-3 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-semibold uppercase">
                      {project.status}
                    </span>
                  </div>
                  <p className="text-white/80 text-lg mb-4 leading-relaxed">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <a
                    href={project.link}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-xl hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] transition-all hover:-translate-y-0.5"
                  >
                    View Project
                    <span className="material-symbols-outlined text-[#0a0a0a] text-xl">
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
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/20 text-white font-semibold rounded-xl hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            Back to Home
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#050c18] py-12 mt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-extrabold text-lg">
                  E
                </div>
                <div>
                  <p className="text-sm text-white/70">EuToNaFila</p>
                  <p className="text-lg font-semibold">AI Software Solutions</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">
                Building intelligent software for companies.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Links</h3>
              <nav className="space-y-2">
                <Link to="/" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  Home
                </Link>
                <Link to="/projects" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  Projects
                </Link>
                <Link to="/about" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  About
                </Link>
                <Link to="/contact" className="block text-white/70 hover:text-[#D4AF37] text-sm transition-colors">
                  Contact
                </Link>
              </nav>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <p className="text-white/70 text-sm mb-2">Software Development</p>
              <p className="text-white/60 text-sm">
                Building solutions for businesses
              </p>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 text-center text-white/50 text-sm">
            <p>&copy; {new Date().getFullYear()} EuToNaFila. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

