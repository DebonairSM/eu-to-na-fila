import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { config } from '@/lib/config';
import { useAuthContext } from '@/contexts/AuthContext';

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 text-xl font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-ring rounded px-2 py-1"
            aria-label={`${config.name} - Home`}
          >
            <span className="material-symbols-outlined">content_cut</span>
            <span className="hidden sm:inline">{config.name}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/#services"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Serviços
            </Link>
            <Link
              to="/#about"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sobre
            </Link>
            <Link
              to="/#location"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Localização
            </Link>
            {user ? (
              <div className="flex items-center gap-4">
                {user.role === 'owner' && (
                  <Link
                    to="/owner"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sair
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/join"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
                >
                  Entrar na Fila
                </Link>
                <Link
                  to="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Entrar (Staff)
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="material-symbols-outlined">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-4 space-y-2">
            <Link
              to="/#services"
              className="block px-4 py-2 rounded-md hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Serviços
            </Link>
            <Link
              to="/#about"
              className="block px-4 py-2 rounded-md hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sobre
            </Link>
            <Link
              to="/#location"
              className="block px-4 py-2 rounded-md hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Localização
            </Link>
            {user ? (
              <>
                {user.role === 'owner' && (
                  <Link
                    to="/owner"
                    className="block px-4 py-2 rounded-md hover:bg-muted"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 rounded-md hover:bg-muted"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/join"
                  className="block px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Entrar na Fila
                </Link>
                <Link
                  to="/login"
                  className="block px-4 py-2 rounded-md hover:bg-muted"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Entrar (Staff)
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
