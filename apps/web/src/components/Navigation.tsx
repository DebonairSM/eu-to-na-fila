import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { config as appConfig } from '@/lib/config';
import { useAuthContext } from '@/contexts/AuthContext';
import { useShopConfig, useShopHomeContent } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { Container } from '@/components/design-system';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout } = useAuthContext();
  const { config: shopConfig } = useShopConfig();
  const homeContent = useShopHomeContent();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const navLabels = homeContent?.nav ?? {
    linkServices: t('nav.services'),
    linkAbout: t('nav.about'),
    linkLocation: t('nav.location'),
    ctaJoin: t('nav.ctaJoin'),
    linkBarbers: t('nav.barbers'),
    labelDashboard: t('nav.dashboard'),
    labelDashboardCompany: t('nav.dashboardCompany'),
    labelLogout: t('nav.logout'),
    labelMenu: t('nav.menu'),
  };
  const shopName = shopConfig.name || appConfig.name;
  const headerIconUrl = homeContent?.branding?.headerIconUrl?.trim();

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
      className={`shop-nav fixed top-0 left-0 right-0 z-50 transition-all overflow-x-hidden ${
        isScrolled
          ? 'py-0.5 sm:py-1.5 shadow-[0_1px_0_rgba(255,255,255,0.06)]'
          : 'py-0.5 sm:py-2'
      }`}
      style={{
        backgroundColor: 'var(--shop-nav-bg, #0a0a0a)',
      }}
      role="navigation"
      aria-label={t('accessibility.mainNav')}
    >
      <Container className="flex items-center justify-between gap-2 sm:gap-3 w-full max-w-full">
        {/* Logo */}
        <Link
          to="/home"
          className="font-['Playfair_Display',serif] text-base sm:text-2xl font-semibold flex items-center justify-center gap-1 sm:gap-3 min-h-[48px] min-w-[48px] px-1 sm:px-2 py-0 rounded transition-all flex-shrink-0 [&:hover]:opacity-90"
          style={{ color: 'var(--shop-accent, #D4AF37)' }}
          aria-label={`${shopName} - ${t('nav.home')}`}
        >
          {headerIconUrl ? (
            <img src={headerIconUrl} alt="" className="h-8 w-8 sm:h-9 sm:w-9 object-contain flex-shrink-0" />
          ) : (
            <span className="material-symbols-outlined text-xl sm:text-2xl leading-none flex items-center justify-center flex-shrink-0">
              content_cut
            </span>
          )}
          <span className="hidden sm:inline truncate">{shopName}</span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden lg:flex items-center gap-4 xl:gap-6 list-none m-0 p-0 flex-shrink-0">
          <li>
            <a
              href="/home#services"
              onClick={(e) => handleHashLink(e, '#services')}
              className="text-[0.9rem] font-medium transition-colors px-3 py-2 rounded min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-nav-bg)] cursor-pointer [&:hover]:[color:var(--shop-accent)]"
              style={{
                color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))',
              }}
            >
              {navLabels.linkServices}
            </a>
          </li>
          <li>
            <a
              href="/home#about"
              onClick={(e) => handleHashLink(e, '#about')}
              className="text-[0.9rem] font-medium transition-colors px-3 py-2 rounded min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-nav-bg)] cursor-pointer [&:hover]:[color:var(--shop-accent)]"
              style={{
                color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))',
              }}
            >
              {navLabels.linkAbout}
            </a>
          </li>
          <li>
            <a
              href="/home#location"
              onClick={(e) => handleHashLink(e, '#location')}
              className="text-[0.9rem] font-medium transition-colors px-3 py-2 rounded min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-nav-bg)] cursor-pointer [&:hover]:[color:var(--shop-accent)]"
              style={{
                color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))',
              }}
            >
              {navLabels.linkLocation}
            </a>
          </li>
          {user && (user.role === 'owner' || user.role === 'barber') ? (
            <>
              <li>
                <Link
                  to={user.role === 'owner' ? '/owner' : '/manage'}
                  className="font-semibold text-[0.9rem] px-4 py-2.5 rounded-lg min-h-[48px] flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    backgroundColor: 'var(--shop-accent, #D4AF37)',
                    color: '#0a0a0a',
                  }}
                >
                  <span className="material-symbols-outlined text-lg">dashboard</span>
                  {navLabels.labelDashboard}
                </Link>
              </li>
              {user.role === 'barber' && (
              <li>
                <Link
                  to="/barbers"
                  className="text-[0.9rem] font-medium px-3 py-2 rounded min-h-[48px] flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 [&:hover]:[color:var(--shop-accent)]"
                  style={{ color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))' }}
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  {t('nav.myProfile')}
                </Link>
              </li>
              )}
              <li>
                <button
                  onClick={handleLogout}
                  className="text-[0.9rem] font-medium transition-colors px-3 py-2 rounded min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 [&:hover]:[color:var(--shop-accent)]"
                  style={{
                    color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))',
                  }}
                >
                  {navLabels.labelLogout}
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  to="/join"
                  className="inline-flex items-center justify-center gap-2 font-semibold text-[0.9rem] px-4 py-2.5 rounded-xl min-h-[44px] transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    color: '#0a0a0a',
                    backgroundColor: 'var(--shop-accent, #D4AF37)',
                  }}
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden>queue</span>
                  {navLabels.ctaJoin}
                </Link>
              </li>
              <li>
                <Link
                  to="/shop/login"
                  className="text-[0.9rem] font-medium transition-colors px-3 py-2 rounded min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 [&:hover]:[color:var(--shop-accent)]"
                  style={{
                    color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))',
                  }}
                >
                  {navLabels.linkBarbers}
                </Link>
              </li>
            </>
          )}
          <li>
            <LanguageSwitcher />
          </li>
        </ul>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden bg-transparent border-0 cursor-pointer p-0 min-w-[48px] min-h-[48px] rounded-lg flex items-center justify-center transition-all hover:bg-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 flex-shrink-0"
          style={{ color: 'var(--shop-text-primary, #fff)' }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={t('nav.toggleMenu')}
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
            className="fixed top-0 left-0 w-64 max-w-[70vw] h-full z-[101] p-4 flex flex-col overflow-y-auto lg:hidden shadow-2xl animate-in slide-in-from-left-4"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.menu')}
            onClick={(e) => e.stopPropagation()}
            style={{
              animationDuration: '250ms',
              animationFillMode: 'both',
              backgroundColor: 'var(--shop-nav-bg, #0a0a0a)',
              borderRight: '1px solid var(--shop-border-color, rgba(255,255,255,0.08))',
            }}
          >
              <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <h2 className="text-base font-semibold" style={{ color: 'var(--shop-accent)' }}>{navLabels.labelMenu}</h2>
                <button
                  className="bg-transparent border-none text-white cursor-pointer p-1.5 min-w-[48px] min-h-[48px] rounded flex items-center justify-center transition-all hover:bg-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMobileMenuOpen(false);
                  }}
                  aria-label={t('nav.closeMenu')}
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
                    className="block text-sm font-medium px-3 py-3 rounded-md transition-all min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] cursor-pointer [&:hover]:[color:var(--shop-accent)] [&:hover]:[background-color:var(--shop-surface-secondary)]"
                    style={{ color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))' }}
                  >
                    {navLabels.linkServices}
                  </a>
                </li>
                <li>
                  <a
                    href="/home#about"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHashLink(e, '#about');
                    }}
                    className="block text-sm font-medium px-3 py-3 rounded-md transition-all min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] cursor-pointer [&:hover]:[color:var(--shop-accent)] [&:hover]:[background-color:var(--shop-surface-secondary)]"
                    style={{ color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))' }}
                  >
                    {navLabels.linkAbout}
                  </a>
                </li>
                <li>
                  <a
                    href="/home#location"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHashLink(e, '#location');
                    }}
                    className="block text-sm font-medium px-3 py-3 rounded-md transition-all min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] cursor-pointer [&:hover]:[color:var(--shop-accent)] [&:hover]:[background-color:var(--shop-surface-secondary)]"
                    style={{ color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))' }}
                  >
                    {navLabels.linkLocation}
                  </a>
                </li>
              </ul>
              <div className="relative z-10 mt-4 space-y-2 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                {user && (user.role === 'owner' || user.role === 'barber') ? (
                  <>
                    <Link
                      to={user.role === 'owner' ? '/owner' : '/manage'}
                      className="block w-full font-semibold text-sm px-4 py-3 rounded-lg min-h-[48px] flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)]"
                      style={{ backgroundColor: 'var(--shop-accent)', color: '#0a0a0a' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span className="material-symbols-outlined text-lg">dashboard</span>
                      {navLabels.labelDashboard}
                    </Link>
                    {user.role === 'barber' && (
                    <Link
                      to="/barbers"
                      className="block w-full text-sm font-medium px-4 py-3 rounded-lg min-h-[48px] flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] [&:hover]:[color:var(--shop-accent)]"
                      style={{ color: 'rgba(255,255,255,0.85)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span className="material-symbols-outlined text-lg">person</span>
                      {t('nav.myProfile')}
                    </Link>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLogout();
                      }}
                      className="block w-full text-left text-sm font-medium px-3 py-3 rounded-md transition-all min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] [&:hover]:[color:var(--shop-accent)] [&:hover]:[background-color:var(--shop-surface-secondary)]"
                      style={{ color: 'rgba(255,255,255,0.85)' }}
                      type="button"
                    >
                      {navLabels.labelLogout}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/join"
                      className="flex items-center justify-center gap-2 w-full font-semibold text-sm px-4 py-3 rounded-xl min-h-[48px] transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2"
                      style={{ color: '#0a0a0a', backgroundColor: 'var(--shop-accent)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span className="material-symbols-outlined text-lg" aria-hidden>queue</span>
                      {navLabels.ctaJoin}
                    </Link>
                    <Link
                      to="/shop/login"
                      className="block text-sm font-medium px-3 py-3 rounded-md transition-all min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] [&:hover]:[color:var(--shop-accent)] [&:hover]:[background-color:var(--shop-surface-secondary)]"
                      style={{ color: 'rgba(255,255,255,0.85)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {navLabels.linkBarbers}
                    </Link>
                  </>
                )}
                <div className="relative z-10 mt-4 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
        </>
      )}
    </nav>
  );
}
