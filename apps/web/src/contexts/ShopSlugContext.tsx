import { createContext, useContext, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { config } from '@/lib/config';

const ShopSlugContext = createContext<string>(config.slug);

/** Extract shop slug from path like /projects/barbearia-premium/join -> barbearia-premium */
function getSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

export function ShopSlugProvider({ children }: { children: React.ReactNode }) {
  useLocation(); // Subscribe to route changes so we re-render on navigation
  const [searchParams] = useSearchParams();
  const fullPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const fromPath = getSlugFromPath(fullPath);
  const fromQuery = searchParams.get('shop');
  const slug = useMemo(
    () =>
      (fromPath && fromPath.trim()) ||
      (fromQuery && fromQuery.trim()) ||
      config.slug,
    [fromPath, fromQuery]
  );
  return (
    <ShopSlugContext.Provider value={slug}>{children}</ShopSlugContext.Provider>
  );
}

export function useShopSlug(): string {
  return useContext(ShopSlugContext);
}
