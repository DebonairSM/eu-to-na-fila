import { createContext, useContext, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { config } from '@/lib/config';

const ShopSlugContext = createContext<string>(config.slug);

const RESERVED_PATH_SEGMENTS = ['api', 'company', 'companies', 'projects', 'about', 'contact', 'health', 'test', 'ws'];

/** Extract shop slug: use server-injected slug when present, else from path (/projects/:slug or short /:slug). */
function getSlugFromPath(pathname: string): string | null {
  const injected = typeof window !== 'undefined' && (window as unknown as { __SHOP_SLUG__?: string }).__SHOP_SLUG__;
  if (injected) return injected;
  const projectsMatch = pathname.match(/^\/projects\/([^/]+)/);
  if (projectsMatch) return projectsMatch[1];
  const shortMatch = pathname.match(/^\/([^/]+)/);
  if (shortMatch && shortMatch[1] && !RESERVED_PATH_SEGMENTS.includes(shortMatch[1])) return shortMatch[1];
  return null;
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
