import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { config } from '@/lib/config';
import { useAuthContext } from '@/contexts/AuthContext';

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/home');
    setIsMobileMenuOpen(false);
  };

  const scrollToSection = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 100; // Account for fixed header
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
    
    // If we're already on the landing page, just scroll
    if (location.pathname === '/mineiro/home') {
      scrollToSection(targetId);
      setIsMobileMenuOpen(false);
    } else {
      // Navigate to landing page with hash, then scroll after a short delay
      navigate(`/mineiro/home${hash}`);
      setIsMobileMenuOpen(false);
      // Wait for navigation and DOM update, then scroll
      setTimeout(() => {
        scrollToSection(targetId);
      }, 300);
    }
  };

  return (
    <nav
      className={`nav fixed top-0 left-0 right-0 z-30 transition-all ${
        isScrolled
          ? 'bg-[rgba(10,10,10,0.95)] backdrop-blur-[20px] py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          : 'bg-[rgba(10,10,10,0.85)] backdrop-blur-[20px] py-4'
      } border-b border-[rgba(212,175,55,0.1)]`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto max-w-6xl px-3 sm:px-5 lg:px-10">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <Link
            to="/mineiro/home"
            className="nav-logo font-['Playfair_Display',serif] text-xl sm:text-2xl font-semibold text-[#D4AF37] flex items-center gap-2 sm:gap-3 min-h-[44px] min-w-[44px] px-2 py-1 rounded transition-all hover:text-[#E8C547] focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2"
            aria-label={`${config.name} - Home`}
          >
            <span className="material-symbols-outlined text-2xl sm:text-[28px]">content_cut</span>
            <span className="hidden sm:inline">{config.name}</span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="nav-links hidden md:flex items-center gap-8 list-none m-0 p-0">
            <li>
              <a
                href="/mineiro/home#services"
                onClick={(e) => handleHashLink(e, '#services')}
                className="text-[0.9rem] font-medium text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] transition-colors px-3 py-2 rounded min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 cursor-pointer"
              >
                Serviços
              </a>
            </li>
            <li>
              <a
                href="/mineiro/home#about"
                onClick={(e) => handleHashLink(e, '#about')}
                className="text-[0.9rem] font-medium text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] transition-colors px-3 py-2 rounded min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 cursor-pointer"
              >
                Sobre
              </a>
            </li>
            <li>
              <a
                href="/mineiro/home#location"
                onClick={(e) => handleHashLink(e, '#location')}
                className="text-[0.9rem] font-medium text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] transition-colors px-3 py-2 rounded min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 cursor-pointer"
              >
                Localização
              </a>
            </li>
            {user ? (
              <>
                {user.role === 'owner' && (
                  <li>
                    <Link
                      to="/owner"
                      className="text-[0.9rem] font-medium text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] transition-colors px-3 py-2 rounded min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2"
                    >
                      Dashboard
                    </Link>
                  </li>
                )}
                <li>
                  <button
                    onClick={handleLogout}
                    className="text-[0.9rem] font-medium text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] transition-colors px-3 py-2 rounded min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2"
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
                    className="nav-cta px-6 py-3 bg-[#D4AF37] text-[#0a0a0a] font-semibold text-sm rounded min-h-[44px] flex items-center justify-center hover:bg-[#E8C547] hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2"
                  >
                    Entrar na Fila
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-[0.9rem] font-medium text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] transition-colors px-3 py-2 rounded min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2"
                  >
                    Entrar (Staff)
                  </Link>
                </li>
              </>
            )}
          </ul>

          {/* Mobile Menu Button */}
          <button
            className="nav-menu-toggle md:hidden bg-transparent border border-[rgba(255,255,255,0.1)] text-white cursor-pointer p-2 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-all hover:bg-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="material-symbols-outlined text-[26px] leading-none">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`nav-menu fixed top-0 left-0 right-0 bottom-0 bg-[rgba(10,10,10,0.97)] backdrop-blur-[20px] z-50 p-5 sm:p-8 pt-20 flex flex-col transform transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:hidden pointer-events-auto`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <button
          className="nav-menu-close absolute top-5 right-5 bg-transparent border-none text-white cursor-pointer p-2 min-w-[44px] min-h-[44px] rounded flex items-center justify-center transition-all hover:bg-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2 z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsMobileMenuOpen(false);
          }}
          aria-label="Fechar menu de navegação"
          type="button"
        >
          <span className="material-symbols-outlined text-[28px]">close</span>
        </button>
        <ul className="nav-menu-links list-none m-0 p-0 flex flex-col gap-2 relative z-10">
          <li>
            <a
              href="/mineiro/home#services"
              onClick={(e) => {
                e.stopPropagation();
                handleHashLink(e, '#services');
              }}
              className="block text-base sm:text-lg font-medium text-[rgba(255,255,255,0.7)] px-4 py-3 rounded-lg transition-all hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)] min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] cursor-pointer"
            >
              Serviços
            </a>
          </li>
          <li>
            <a
              href="/mineiro/home#about"
              onClick={(e) => {
                e.stopPropagation();
                handleHashLink(e, '#about');
              }}
              className="block text-base sm:text-lg font-medium text-[rgba(255,255,255,0.7)] px-4 py-3 rounded-lg transition-all hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)] min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] cursor-pointer"
            >
              Sobre
            </a>
          </li>
          <li>
            <a
              href="/mineiro/home#location"
              onClick={(e) => {
                e.stopPropagation();
                handleHashLink(e, '#location');
              }}
              className="block text-base sm:text-lg font-medium text-[rgba(255,255,255,0.7)] px-4 py-3 rounded-lg transition-all hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)] min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] cursor-pointer"
            >
              Localização
            </a>
          </li>
        </ul>
        <div className="relative z-10">
          {user ? (
            <>
              {user.role === 'owner' && (
                <Link
                  to="/owner"
                  className="block text-lg font-medium text-[rgba(255,255,255,0.7)] px-5 py-4 rounded-lg transition-all hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)] min-h-[44px] flex items-center mt-6 focus:outline-none focus:ring-2 focus:ring-[#E8C547]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Dashboard
                </Link>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLogout();
                }}
                className="block w-full text-left text-lg font-medium text-[rgba(255,255,255,0.7)] px-5 py-4 rounded-lg transition-all hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)] min-h-[44px] flex items-center mt-2 focus:outline-none focus:ring-2 focus:ring-[#E8C547]"
                type="button"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                to="/join"
                className="nav-menu-cta block mt-6 px-6 py-4 bg-[#D4AF37] text-[#0a0a0a] font-semibold rounded-lg text-center min-h-[44px] flex items-center justify-center hover:bg-[#E8C547] transition-all focus:outline-none focus:ring-2 focus:ring-[#E8C547] focus:ring-offset-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMobileMenuOpen(false);
                }}
              >
                Entrar na Fila
              </Link>
              <Link
                to="/login"
                className="block text-lg font-medium text-[rgba(255,255,255,0.7)] px-5 py-4 rounded-lg transition-all hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)] min-h-[44px] flex items-center mt-2 focus:outline-none focus:ring-2 focus:ring-[#E8C547]"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMobileMenuOpen(false);
                }}
              >
                Entrar (Staff)
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
