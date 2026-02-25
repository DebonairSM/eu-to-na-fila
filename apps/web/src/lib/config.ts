/** API base URL: relative in dev (Vite proxy), or set VITE_API_BASE_URL in production if API is on another origin. */
const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Base path for the current shop (e.g. /shops or /projects/mineiro). Uses server-injected __SHOP_PATH__ when set. */
export function getShopBasePath(): string {
  if (typeof window === 'undefined') return '/mineiro';
  const injected = (window as unknown as { __SHOP_PATH__?: string }).__SHOP_PATH__;
  if (injected) return injected.replace(/\/+$/, '') || '/';
  const projectsMatch = window.location.pathname.match(/^\/projects\/[^/]+/);
  if (projectsMatch) return projectsMatch[0];
  const shortMatch = window.location.pathname.match(/^\/[^/]+/);
  return shortMatch ? shortMatch[0] : (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') || '/mineiro';
}

export const config = {
  apiBase,
  /** Fallback slug when URL path does not contain /projects/:slug (e.g. config loading). */
  slug: 'mineiro',
  /** Fallback name when shop config is loading or fetch fails. */
  name: 'Barbearia',
  /** Fallback path when shop config is loading or fetch fails. */
  path: '/mineiro',
};

