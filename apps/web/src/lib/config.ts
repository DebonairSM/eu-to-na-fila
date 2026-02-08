/** API base URL: relative in dev (Vite proxy), or set VITE_API_BASE_URL in production if API is on another origin. */
const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const config = {
  apiBase,
  /** Fallback slug when URL path does not contain /projects/:slug (e.g. config loading). */
  slug: 'mineiro',
  /** Fallback name when shop config is loading or fetch fails. */
  name: 'Barbearia',
  /** Fallback path when shop config is loading or fetch fails. */
  path: '/projects/mineiro',
};

