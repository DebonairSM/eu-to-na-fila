import { Link } from 'react-router-dom';

export function RootHomePage() {
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
                className="text-white/70 hover:text-[#D4AF37] transition-colors text-sm font-medium"
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

      <main className="w-full">
        <section className="relative min-h-[90vh] flex items-center justify-center px-4 sm:px-6 py-20 sm:py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-transparent" />
          <div className="relative max-w-6xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/12 text-[#8ad6b0] text-xs font-semibold uppercase tracking-[0.28em]">
              AI Software • Enterprise Solutions
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight max-w-5xl mx-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              AI Software for Companies
            </h1>
            <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Empowering businesses with intelligent software solutions to improve effectiveness, streamline operations, and drive growth.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/projects"
                className="px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-xl hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] transition-all hover:-translate-y-0.5"
              >
                View Projects
              </Link>
              <Link
                to="/contact"
                className="px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-xl hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#050c18] py-12">
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
