import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Paths that belong to the root SPA (company site), not the barbershop app
const ROOT_SPA_PATHS = ['/company', '/projects', '/about', '/contact'];

function isRootSpaPath(path: string): boolean {
  return ROOT_SPA_PATHS.some((p) => path === p || path.startsWith(p + '/'));
}

// Plugin: redirect / and /mineiro to /projects/mineiro/; serve root.html for root SPA paths
const redirectPlugin = (): Plugin => ({
  name: 'redirect-mineiro',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const path = req.url?.split('?')[0] ?? '';
      const q = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';

      if (isRootSpaPath(path)) {
        req.url = '/root.html' + q;
        next();
        return;
      }
      if (path === '/' || path === '/mineiro') {
        res.writeHead(302, { Location: `/projects/mineiro/${q}` });
        res.end();
        return;
      }
      next();
    });
  },
});

// Web dev server port; do not use PORT (API may use it in .env)
const webPort = Number(process.env.WEB_PORT ?? 4040);
// Proxy target: use API_PORT if set, else PORT so it matches the API server (same .env)
const apiPort = Number(process.env.API_PORT ?? process.env.PORT ?? 4041);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [redirectPlugin(), react()],
  base: '/projects/mineiro/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@eutonafila/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: webPort,
    hmr: {
      clientPort: webPort,
      path: '/projects/mineiro/',
    },
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        timeout: 120000,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.error(
              `[vite] API proxy error: cannot reach http://localhost:${apiPort}. Is the API running? (pnpm dev starts both web and API.)`
            );
            if (res && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'API server unreachable', code: 'BAD_GATEWAY' }));
            }
          });
        },
      },
      '/ws': {
        target: `ws://localhost:${apiPort}`,
        ws: true,
      },
    },
  },
  build: {
    // Enable minification
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2015',
    // Optimize chunk splitting
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'ui-vendor': ['clsx', 'tailwind-merge'],
          // Shared utilities
          'shared': ['@eutonafila/shared'],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: (chunkInfo) => {
          // Root build uses root- prefix, mineiro uses default
          if (chunkInfo.name === 'root') {
            return 'assets/js/root-[hash].js';
          }
          return 'assets/js/[name]-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Optimize asset handling
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    // Enable source maps for production debugging (optional, can be disabled)
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    cssMinify: true,
    // Chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
    // Enable tree-shaking
    treeshake: {
      moduleSideEffects: false,
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: [],
  },
});

