export const config = {
  slug: 'mineiro',
  name: 'Barbearia Mineiro',
  // In development, use Vite proxy (relative path) to avoid CORS.
  apiBase: import.meta.env.DEV ? '' : 'https://eutonafila.com',
  theme: {
    primary: '#3E2723',
    accent: '#FFD54F',
  },
};

