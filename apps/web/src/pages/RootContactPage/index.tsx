import { Link } from 'react-router-dom';

export function RootContactPage() {
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
                className="text-[#D4AF37] border-b-2 border-[#D4AF37] pb-1 text-sm font-medium"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold mb-4">Contact Us</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Interested in working together? Get in touch and let's discuss how we can help improve your business.
          </p>
        </header>

        <section className="mb-16">
          <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-2xl p-8 sm:p-12 lg:p-16">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-[#0f3d2e]/20 via-[#D4AF37]/10 to-[#0e1f3d]/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-semibold mb-6">Get in Touch</h2>
              <p className="text-lg text-white/80 leading-relaxed mb-8">
                Whether you're looking to improve your business operations, explore AI solutions, or discuss a custom software project, we're here to help. Reach out and let's start a conversation.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#0a0a0a] text-2xl">email</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Email</h3>
                    <p className="text-white/70">For inquiries and project discussions</p>
                    <p className="text-[#D4AF37] mt-1">contact@eutonafila.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#0a0a0a] text-2xl">business</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Services</h3>
                    <p className="text-white/70">AI Software Development</p>
                    <p className="text-white/70">Business Process Optimization</p>
                    <p className="text-white/70">Custom Software Solutions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="text-center">
          <Link
            to="/projects"
            className="inline-block px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-xl hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all"
          >
            View Our Projects
          </Link>
        </section>
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

