import { Link, useLocation } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';

export function RootSiteNav() {
  const location = useLocation();

  const navLinks = [
    { to: '/projects', label: 'Projetos' },
    { to: '/about', label: 'Sobre' },
    { to: '/contact', label: 'Contato' },
  ];

  return (
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
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white border-b border-white/20 pb-1'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </Container>
    </nav>
  );
}
