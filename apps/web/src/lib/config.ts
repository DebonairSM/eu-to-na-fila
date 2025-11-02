export const config = {
  slug: 'mineiro',
  name: 'Barbearia Mineiro',
  apiBase: import.meta.env.DEV ? 'http://localhost:3000' : 'https://eutonafila.com',
  wsBase: import.meta.env.DEV ? 'ws://localhost:3000' : 'wss://eutonafila.com',
  theme: {
    primary: '#3E2723',
    accent: '#FFD54F',
  },
};

