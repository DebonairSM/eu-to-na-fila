import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { config } from '@/lib/config';
import { useAuthContext } from '@/contexts/AuthContext';
import { Container } from '@/components/design-system';

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => {
      document.body.classList.remove('menu-open');
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/home');
    setIsMobileMenuOpen(false);
  };

  const scrollToSection = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleHashLink = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    const targetId = hash.replace('#', '');
    
    // Check if we're on the home route (with or without basename)
    const isHomeRoute = location.pathname === '/home' || location.pathname === '/projects/mineiro/home' || location.pathname.endsWith('/home');
    
    if (isHomeRoute) {
      scrollToSection(targetId);
      setIsMobileMenuOpen(false);
    } else {
      navigate(`/home${hash}`);
      setIsMobileMenuOpen(false);
      setTimeout(() => {
        scrollToSection(targetId);
      }, 300);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all overflow-x-hidden ${
        isScrolled
          ? 'bg-[#0a0a0a] py-0.5 sm:py-1.5 shadow-[0_1px_0_rgba(255,255,255,0.06)]'
          : 'bg-[#0a0a0a] py-0.5 sm:py-2'
      } border-b border-[rgba(255,255,255,0.08)]`}
      role="navigation"
      aria-label="Main navigation"
    >
      <Container className="flex items-center justify-between gap-2 sm:gap-3 w-full max-w-full">
        {/* Logo */}
        <Link
          to="/home"
          className="font-['Playfair_Display',serif] text-base sm:text-2xl font-semibold text-[#D4AF37] flex items-center justify-center gap-1 sm:gap-3 min-h-[48px] min-w-[48px] px-1 sm:px-2 py-0 rounded transition-all hover:text-[#E8C547] focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 flex-shrink-0"
          aria-label={`${config.name} - Home`}
        >
          <span className="material-symbols-outlined text-xl sm:text-2xl leading-none flex items-center justify-center flex-shrink-0">
            content_cut
          </span>
          <span className="hidden sm:inline truncate">{config.name}</span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden lg:flex items-center gap-4 xl:gap-6 list-none m-0 p-0 flex-shrink-0">
          <li>
            <a
              href="/home#services"
              onClick={(e) => handleHashLink(e, '#services')}
              className="text-[0.9rem] font-medium text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] transition-colors px-3 py-2 rounded min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 cursor-pointer"
            >
              Serviços
            </a>
          </li>
          <li>
            <a
              href="/home#about"
              onClick={(e) => handleHashLink(e, '#about')}
              className="text-[0.9rem] font-medium text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] transition-colors px-3 py-2 rounded min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 cursor-pointer"
            >
              Sobre
            </a>
          </li>
          <li>
            <a
              href="/home#location"
              onClick={(e) => handleHashLink(e, '#location')}
              className="text-[0.9rem] font-medium text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] transition-colors px-3 py-2 rounded min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 cursor-pointer"
            >
              Localização
            </a>
          </li>
          {user ? (
            <>
              {(user.role === 'owner' || user.role === 'barber') && (
                <li>
                  <Link
                    to={user.role === 'owner' ? '/owner' : '/manage'}
                    className="bg-[#D4AF37] text-[#0a0a0a] font-semibold text-[0.9rem] px-4 py-2.5 rounded-lg min-h-[48px] flex items-center gap-2 transition-colors hover:bg-[#E8C547] focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
                  >
                    <span className="material-symbols-outlined text-lg">dashboard</span>
                    Dashboard
                  </Link>
                </li>
              )}
              {user.role === 'company_admin' && (
                <li>
                  <Link
                    to="/company/dashboard"
                    className="bg-[#D4AF37] text-[#0a0a0a] font-semibold text-[0.9rem] px-4 py-2.5 rounded-lg min-h-[48px] flex items-center gap-2 transition-colors hover:bg-[#E8C547] focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
                  >
                    <span className="material-symbols-outlined text-lg">business</span>
                    Dashboard Empresarial
                  </Link>
                </li>
              )}
              <li>
                <button
                  onClick={handleLogout}
                  className="text-[0.9rem] font-medium text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] transition-colors px-3 py-2 rounded min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2"
                >
                  Sair
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  to="/join"
                  className="inline-flex items-center justify-center gap-2 font-semibold text-[0.9rem] text-[#0a0a0a] bg-[#D4AF37] px-4 py-2.5 rounded-xl min-h-[44px] shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:bg-[#E8C547] hover:shadow-[0_6px_24px_rgba(212,175,55,0.35)] transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden>queue</span>
                  Entrar na Fila
                </Link>
              </li>
              <li>
                <Link
                  to="/shop/login"
                  className="text-[0.9rem] font-medium text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] transition-colors px-3 py-2 rounded min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2"
                >
                  Barbeiros
                </Link>
              </li>
            </>
          )}
        </ul>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden bg-transparent border-0 text-white cursor-pointer p-0 min-w-[48px] min-h-[48px] rounded-lg flex items-center justify-center transition-all hover:bg-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 flex-shrink-0"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span className="material-symbols-outlined text-xl leading-none flex items-center justify-center">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </Container>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed top-0 left-0 w-64 max-w-[70vw] h-full bg-[#0a0a0a] z-[101] p-4 flex flex-col overflow-y-auto lg:hidden shadow-2xl border-r border-[rgba(255,255,255,0.08)] animate-in slide-in-from-left-4"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            onClick={(e) => e.stopPropagation()}
            style={{
              animationDuration: '250ms',
              animationFillMode: 'both',
            }}
          >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(255,255,255,0.1)]">
                <h2 className="text-base font-semibold text-[#D4AF37]">Menu</h2>
                <button
                  className="bg-transparent border-none text-white cursor-pointer p-1.5 min-w-[48px] min-h-[48px] rounded flex items-center justify-center transition-all hover:bg-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMobileMenuOpen(false);
                  }}
                  aria-label="Fechar menu de navegação"
                  type="button"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <ul className="list-none m-0 p-0 flex flex-col gap-1 relative z-10">
                <li>
                  <a
                    href="/home#services"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHashLink(e, '#services');
                    }}
                    className="block text-sm font-medium text-[rgba(255,255,255,0.7)] px-3 py-3 rounded-md transition-all hover:text-[#D4AF37] hover:bg-[#1a1a1a] min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] cursor-pointer"
                  >
                    Serviços
                  </a>
                </li>
                <li>
                  <a
                    href="/home#about"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHashLink(e, '#about');
                    }}
                    className="block text-sm font-medium text-[rgba(255,255,255,0.7)] px-3 py-3 rounded-md transition-all hover:text-[#D4AF37] hover:bg-[#1a1a1a] min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] cursor-pointer"
                  >
                    Sobre
                  </a>
                </li>
                <li>
                  <a
                    href="/home#location"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHashLink(e, '#location');
                    }}
                    className="block text-sm font-medium text-[rgba(255,255,255,0.7)] px-3 py-3 rounded-md transition-all hover:text-[#D4AF37] hover:bg-[#1a1a1a] min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] cursor-pointer"
                  >
                    Localização
                  </a>
                </li>
              </ul>
              <div className="relative z-10 mt-4 space-y-2 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                {user ? (
                  <>
                    {(user.role === 'owner' || user.role === 'barber') && (
                      <Link
                        to={user.role === 'owner' ? '/owner' : '/manage'}
                        className="block w-full bg-[#D4AF37] text-[#0a0a0a] font-semibold text-sm px-4 py-3 rounded-lg min-h-[48px] flex items-center gap-2 transition-colors hover:bg-[#E8C547] focus:outline-none focus:ring-2 focus:ring-[#E8C547]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <span className="material-symbols-outlined text-lg">dashboard</span>
                        Dashboard
                      </Link>
                    )}
                    {user.role === 'company_admin' && (
                      <Link
                        to="/company/dashboard"
                        className="block w-full bg-[#D4AF37] text-[#0a0a0a] font-semibold text-sm px-4 py-3 rounded-lg min-h-[48px] flex items-center gap-2 transition-colors hover:bg-[#E8C547] focus:outline-none focus:ring-2 focus:ring-[#E8C547]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <span className="material-symbols-outlined text-lg">business</span>
                        Dashboard Empresarial
                      </Link>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLogout();
                      }}
                      className="block w-full text-left text-sm font-medium text-[rgba(255,255,255,0.85)] px-3 py-3 rounded-md transition-all hover:text-[#D4AF37] hover:bg-[#1a1a1a] min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547]"
                      type="button"
                    >
                      Sair
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/join"
                      className="flex items-center justify-center gap-2 w-full font-semibold text-sm text-[#0a0a0a] bg-[#D4AF37] px-4 py-3 rounded-xl min-h-[48px] shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:bg-[#E8C547] hover:shadow-[0_6px_24px_rgba(212,175,55,0.35)] transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span className="material-symbols-outlined text-lg" aria-hidden>queue</span>
                      Entrar na Fila
                    </Link>
                    <Link
                      to="/shop/login"
                      className="block text-sm font-medium text-[rgba(255,255,255,0.85)] px-3 py-3 rounded-md transition-all hover:text-[#D4AF37] hover:bg-[#1a1a1a] min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Barbeiros
                    </Link>
                  </>
                )}
              </div>
            </div>
        </>
      )}
    </nav>
  );
}
