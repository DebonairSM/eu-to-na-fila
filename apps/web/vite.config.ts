import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin to redirect /mineiro to /mineiro/
const redirectPlugin = (): Plugin => ({
  name: 'redirect-mineiro',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/mineiro') {
        res.writeHead(301, { Location: '/mineiro/' });
        res.end();
        return;
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [redirectPlugin(), react()],
  base: '/mineiro/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4040,
    hmr: {
      clientPort: 4040,
      path: '/mineiro/',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4041',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:4041',
        ws: true,
      },
    },
  },
});

