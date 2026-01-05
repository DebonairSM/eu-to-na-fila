import { Link } from 'react-router-dom';

export function RootAboutPage() {
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
                className="text-[#D4AF37] border-b-2 border-[#D4AF37] pb-1 text-sm font-medium"
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
          <h1 className="text-4xl sm:text-5xl font-semibold mb-4">About EuToNaFila</h1>
          <p className="text-lg text-white/70 max-w-2xl">
            Building intelligent software solutions that help companies improve their effectiveness.
          </p>
        </header>

        <section className="mb-16">
          <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-2xl p-8 sm:p-12 lg:p-16">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-[#0f3d2e]/20 via-[#D4AF37]/10 to-[#0e1f3d]/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-semibold mb-6">Our Mission</h2>
              <p className="text-lg text-white/80 leading-relaxed mb-6">
                EuToNaFila is a software development company focused on creating intelligent solutions that help businesses improve their effectiveness. We combine cutting-edge AI technology with practical business insights to deliver software that makes a real difference.
              </p>
              <p className="text-lg text-white/80 leading-relaxed">
                Our goal is to empower companies with tools that streamline operations, optimize workflows, and drive sustainable growth through technology.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl sm:text-4xl font-semibold mb-8">What We Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: 'psychology',
                title: 'AI-Powered Solutions',
                description: 'Leverage artificial intelligence to automate processes, gain insights, and make data-driven decisions.',
              },
              {
                icon: 'trending_up',
                title: 'Improve Effectiveness',
                description: 'Optimize workflows and operations to increase productivity and reduce operational costs.',
              },
              {
                icon: 'integration_instructions',
                title: 'Custom Development',
                description: 'Tailored software solutions designed to fit your specific business needs and requirements.',
              },
              {
                icon: 'analytics',
                title: 'Data Analytics',
                description: 'Transform raw data into actionable insights that drive business growth and optimization.',
              },
              {
                icon: 'speed',
                title: 'Performance Focus',
                description: 'High-performance applications built for scale, reliability, and optimal user experience.',
              },
              {
                icon: 'security',
                title: 'Enterprise Ready',
                description: 'Secure, scalable solutions that meet enterprise standards and compliance requirements.',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:bg-white/8 transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#0a0a0a] text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <Link
            to="/contact"
            className="inline-block px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-xl hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] transition-all hover:-translate-y-0.5"
          >
            Get in Touch
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

