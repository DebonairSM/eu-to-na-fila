import { config } from '@/lib/config';

const RESERVED = new Set(['api', 'company', 'companies', 'projects', 'about', 'contact', 'health', 'test', 'ws']);

/** Slug from pathname only (no query). */
export function getShopSlugFromPathname(pathname: string): string | null {
  const injected = typeof window !== 'undefined' && (window as unknown as { __SHOP_SLUG__?: string }).__SHOP_SLUG__;
  if (injected) return injected;
  const projectsMatch = pathname.match(/^\/projects\/([^/]+)/);
  if (projectsMatch) return projectsMatch[1];
  const shortMatch = pathname.match(/^\/([^/]+)/);
  if (shortMatch?.[1] && !RESERVED.has(shortMatch[1])) return shortMatch[1];
  return null;
}

/** Current shop slug for theme/API (matches ShopSlugProvider resolution). */
export function getShopSlugFromLocation(): string {
  if (typeof window === 'undefined') return config.slug;
  const fromPath = getShopSlugFromPathname(window.location.pathname);
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('shop');
  return (fromPath && fromPath.trim()) || (fromQuery && fromQuery.trim()) || config.slug;
}
