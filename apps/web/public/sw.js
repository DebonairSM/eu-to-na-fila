/**
 * Service Worker for EuTôNaFila PWA
 * 
 * Provides offline support by caching static assets and API responses.
 * Auto-updates when new version is deployed.
 */

const CACHE_NAME = 'eutonafila-v2';
const API_CACHE_NAME = 'eutonafila-api-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/mineiro/',
  '/mineiro/index.html',
  '/mineiro/favicon.svg',
  '/mineiro/manifest.json',
  '/mineiro/icon-192.png',
  '/mineiro/icon-512.png',
  '/mineiro/fonts/MaterialSymbolsOutlined.ttf'
];

// API endpoints to cache (with short TTL)
const API_ROUTES = [
  '/api/shops/',
  '/api/tickets/',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event - serve from cache or network
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  try {
    const url = new URL(request.url);

    // Skip WebSocket requests
    if (url.protocol === 'ws:' || url.protocol === 'wss:') {
      return;
    }

    // Skip chrome-extension and other non-http(s) schemes
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return;
    }

    // Skip Vite development server requests (HMR, @vite, @react-refresh, @fs)
    if (url.pathname.includes('/@vite/') || 
        url.pathname.includes('/@react-refresh') || 
        url.pathname.includes('/@fs/') ||
        url.pathname.includes('node_modules')) {
      return;
    }

    // Skip non-GET requests
    if (request.method !== 'GET') {
      return;
    }

    // Handle API requests (network first, fallback to cache)
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirstStrategy(request));
      return;
    }

    // Handle static assets (cache first, fallback to network)
    event.respondWith(cacheFirstStrategy(request));
  } catch (error) {
    // Skip requests that can't be parsed as URLs
    console.warn('[SW] Skipping invalid URL:', request.url);
    return;
  }
});

/**
 * Cache-first strategy for static assets
 * Fast loading, always uses cached version if available
 */
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }

  try {
    console.log('[SW] Fetching from network:', request.url);
    const response = await fetch(request);
    
    // Only cache successful responses from same origin
    if (response.status === 200 && response.type !== 'opaque') {
      try {
        await cache.put(request, response.clone());
      } catch (cacheError) {
        // Silently fail cache writes for unsupported requests
        console.warn('[SW] Failed to cache:', request.url, cacheError.message);
      }
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/mineiro/index.html');
    }
    
    throw error;
  }
}

/**
 * Network-first strategy for API requests
 * Always try network first, fallback to cache if offline
 */
async function networkFirstStrategy(request) {
  const cache = await caches.open(API_CACHE_NAME);

  try {
    console.log('[SW] Fetching API from network:', request.url);
    const response = await fetch(request);
    
    // Cache successful API responses (short TTL)
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);
    
    if (cached) {
      // Add header to indicate cached response
      const cachedResponse = cached.clone();
      return new Response(cachedResponse.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: {
          ...Object.fromEntries(cached.headers.entries()),
          'X-From-Cache': 'true',
        },
      });
    }
    
    throw error;
  }
}

/**
 * Handle messages from the app
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});

