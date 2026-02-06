/** API base URL: relative in dev (Vite proxy), or set VITE_API_BASE_URL in production if API is on another origin. */
const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const config = {
  slug: 'mineiro',
  name: 'Barbearia Mineiro',
  path: '/projects/mineiro',
  apiBase: apiBase,
  theme: {
    primary: '#3E2723',
    accent: '#FFD54F',
  },
};

