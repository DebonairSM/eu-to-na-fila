import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/mineiro/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    hmr: {
      clientPort: 5174,
      path: '/mineiro/',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3002',
        ws: true,
      },
    },
  },
});

