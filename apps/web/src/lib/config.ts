/** API base URL for the API client only. Relative (e.g. /api) is used as-is, not prefixed with shop path; see getEffectiveBaseUrl in lib/api/client.ts. Set VITE_API_BASE_URL in production if the API is on another origin. */
const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Base path for the current shop (e.g. /shops or /shop). Uses server-injected __SHOP_PATH__ when set. */
export function getShopBasePath(): string {
  if (typeof window === 'undefined') return '/';
  const injected = (window as unknown as { __SHOP_PATH__?: string }).__SHOP_PATH__;
  if (injected) return injected.replace(/\/+$/, '') || '/';
  const projectsMatch = window.location.pathname.match(/^\/projects\/[^/]+/);
  if (projectsMatch) return projectsMatch[0];
  const shortMatch = window.location.pathname.match(/^\/[^/]+/);
  return shortMatch ? shortMatch[0] : (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') || '/';
}

export const config = {
  apiBase,
  /** Fallback slug when URL path does not contain a shop segment (e.g. config loading). */
  slug: 'shop',
  /** Fallback name when shop config is loading or fetch fails. */
  name: 'Barbearia',
  /** Fallback path when shop config is loading or fetch fails. */
  path: '/shop',
};

