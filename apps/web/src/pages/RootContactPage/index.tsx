import { Link } from 'react-router-dom';

export function RootContactPage() {
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
                className="text-sm text-white border-b border-white/20 pb-1 font-medium"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <header className="mb-16 text-center">
          <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">Contact Us</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
            Interested in working together? Get in touch and let's discuss how we can help improve your business.
          </p>
        </header>

        <section className="mb-16">
          <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-12">
            <h2 className="text-3xl font-light mb-8">Get in Touch</h2>
            <p className="text-lg text-gray-300 leading-relaxed mb-10">
              Whether you're looking to improve your business operations, explore AI solutions, or discuss a custom software project, we're here to help. Reach out and let's start a conversation.
            </p>
            
            <div className="space-y-8">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-gray-300 text-xl">email</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Email</h3>
                  <p className="text-gray-400 mb-1">For inquiries and project discussions</p>
                  <p className="text-blue-400">contact@eutonafila.com</p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-gray-300 text-xl">business</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-3">Services</h3>
                  <div className="space-y-1.5 text-gray-400">
                    <p>AI Software Development</p>
                    <p>Business Process Optimization</p>
                    <p>Custom Software Solutions</p>
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
            View Our Projects
          </Link>
        </section>
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
