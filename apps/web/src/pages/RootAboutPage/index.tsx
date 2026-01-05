import { Link } from 'react-router-dom';

export function RootAboutPage() {
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
                className="text-sm text-white border-b border-white/20 pb-1 font-medium"
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
          <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">About EuToNaFila</h1>
          <p className="text-xl text-gray-400 max-w-2xl leading-relaxed font-light">
            We build sophisticated software solutions that help companies improve effectiveness and achieve their goals.
          </p>
        </header>

        <section className="mb-20">
          <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-12">
            <h2 className="text-3xl font-light mb-6">Our Mission</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p className="text-lg">
                EuToNaFila is a software development company focused on creating intelligent solutions that help businesses improve their effectiveness. We combine advanced technology with practical business insights to deliver software that makes a meaningful difference.
              </p>
              <p className="text-lg">
                Our approach is centered on understanding business needs and building solutions that are both technically excellent and genuinely useful. We aim to empower companies with tools that streamline operations, optimize workflows, and drive sustainable growth.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-3xl font-light mb-12">What We Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'AI-Powered Solutions',
                description: 'Leverage artificial intelligence to automate processes, gain insights, and make data-driven decisions.',
              },
              {
                title: 'Improve Effectiveness',
                description: 'Optimize workflows and operations to increase productivity and reduce operational costs.',
              },
              {
                title: 'Custom Development',
                description: 'Tailored software solutions designed to fit your specific business needs and requirements.',
              },
              {
                title: 'Data Analytics',
                description: 'Transform raw data into actionable insights that drive business growth and optimization.',
              },
              {
                title: 'Performance Focus',
                description: 'High-performance applications built for scale, reliability, and optimal user experience.',
              },
              {
                title: 'Enterprise Ready',
                description: 'Secure, scalable solutions that meet enterprise standards and compliance requirements.',
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
            Get in Touch
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
