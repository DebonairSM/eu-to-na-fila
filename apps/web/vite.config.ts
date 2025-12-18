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

