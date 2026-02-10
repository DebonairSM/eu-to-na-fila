import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/design-system/Spacing/Container';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LOGO_URL } from '@/lib/logo';

const links = [
  { label: 'Home', to: '/home' },
  { label: 'Sobre', to: '/about' },
  { label: 'Galeria', to: '/network' },
  { label: 'Contato', to: '/contact' },
];

export function CompanyNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (open) setOpen(false);
  }, [location.pathname]);

  return (
    <header className="border-b border-white/10 bg-[#071124]">
      <Container size="2xl">
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="EuTô NaFila"
              className="h-8 sm:h-10 w-auto object-contain flex-shrink-0"
            />
          <div>
            <p className="text-xs text-white/70">EuTô NaFila</p>
            <p className="text-sm font-semibold">Virtual Line Software</p>
          </div>
        </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <nav className="hidden md:flex items-center gap-2 text-sm">
            {links.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071124] ${
                    active
                      ? 'bg-white/10 text-[#D4AF37] border border-white/10 shadow-[0_0_0_1px_rgba(212,175,55,0.2)]'
                      : 'text-white/85 hover:text-[#D4AF37] hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="relative md:hidden">
            <Button
              variant="outline"
              className="border-white/25 text-white hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071124] min-w-[44px] min-h-[44px]"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={open}
              aria-label="Abrir menu"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
            >
              Menu
            </Button>
            {open && (
              <div className="absolute right-0 mt-2 w-52 rounded-lg border border-white/20 bg-[#0b1a33] shadow-lg shadow-black/30 p-2 space-y-1 text-sm z-50">
                {links.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block rounded-md px-3 py-2 text-white hover:text-[#D4AF37] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1a33]"
                    onClick={() => setOpen(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setOpen(false);
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}

