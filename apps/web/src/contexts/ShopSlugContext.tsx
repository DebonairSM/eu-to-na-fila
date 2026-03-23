import { createContext, useContext, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { config } from '@/lib/config';
import { getShopSlugFromPathname } from '@/lib/shopSlugFromPath';

const ShopSlugContext = createContext<string>(config.slug);

export function ShopSlugProvider({ children }: { children: React.ReactNode }) {
  useLocation(); // Subscribe to route changes so we re-render on navigation
  const [searchParams] = useSearchParams();
  const fullPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const fromPath = getShopSlugFromPathname(fullPath);
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
