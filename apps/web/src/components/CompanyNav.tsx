import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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
    <header className="border-b border-white/10 bg-[rgba(5,12,24,0.88)] backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-extrabold text-lg shadow-lg shadow-[#0f3d2e]/40">
            E
          </div>
          <div>
            <p className="text-sm text-white/70">EuToNaFila</p>
            <p className="text-lg font-semibold">Virtual Line Software</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
              className="border-white/20 text-white hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071124]"
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
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-white/20 bg-white/10 backdrop-blur-2xl shadow-lg shadow-black/30 p-2 space-y-1 text-sm">
                {links.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block rounded-md px-3 py-2 text-white/85 hover:text-[#D4AF37] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1a33]"
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
      </div>
    </header>
  );
}

