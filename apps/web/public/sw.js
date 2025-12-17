/**
 * Service Worker for EuTôNaFila PWA
 * 
 * Provides offline support by caching static assets and API responses.
 * Auto-updates when new version is deployed.
 */

const CACHE_NAME = 'eutonafila-v5';
const API_CACHE_NAME = 'eutonafila-api-v5';
const VIDEO_CACHE_NAME = 'eutonafila-video-v5';

// Cache size limits (in bytes)
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB total
const MAX_VIDEO_CACHE_SIZE = 10 * 1024 * 1024; // 10MB for videos
const MAX_API_CACHE_SIZE = 5 * 1024 * 1024; // 5MB for API responses

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
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME && name !== VIDEO_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that new service worker is active
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED', cacheVersion: CACHE_NAME });
        });
      });
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

    // Handle video files with separate cache
    if (url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm') || url.pathname.endsWith('.ogg')) {
      event.respondWith(videoCacheStrategy(request));
      return;
    }

    // Don't cache HTML files aggressively - always check network first for HTML
    if (request.mode === 'navigate' || (url.pathname.endsWith('.html') && !url.pathname.includes('index.html'))) {
      event.respondWith(networkFirstStrategy(request));
      return;
    }
    
    // Handle static assets (stale-while-revalidate)
    event.respondWith(cacheFirstStrategy(request));
  } catch (error) {
    // Skip requests that can't be parsed as URLs
    console.warn('[SW] Skipping invalid URL:', request.url);
    return;
  }
});

/**
 * Stale-while-revalidate strategy for static assets
 * Serves from cache immediately, then updates cache in background
 * Prevents stale CSS/JS from causing black/white screens
 */
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Always try to fetch fresh version in background
  const fetchPromise = fetch(request).then((response) => {
    // Only cache successful responses from same origin
    if (response.status === 200 && response.type !== 'opaque') {
      try {
        cache.put(request, response.clone());
      } catch (cacheError) {
        // Silently fail cache writes for unsupported requests
        console.warn('[SW] Failed to cache:', request.url, cacheError.message);
      }
    }
    return response;
  }).catch((error) => {
    console.error('[SW] Background fetch failed:', error);
    return null;
  });

  // If we have cached version, return it immediately
  if (cached) {
    console.log('[SW] Cache hit (stale-while-revalidate):', request.url);
    // Update cache in background
    fetchPromise.catch(() => {
      // Ignore background update errors
    });
    return cached;
  }

  // No cache, wait for network
  try {
    console.log('[SW] Fetching from network:', request.url);
    const response = await fetchPromise;
    
    if (response) {
      return response;
    }
    
    throw new Error('Network fetch failed');
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match('/mineiro/index.html');
      if (offlinePage) {
        return offlinePage;
      }
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
      // Check cache size before adding
      await enforceCacheSizeLimit(API_CACHE_NAME, MAX_API_CACHE_SIZE);
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
 * Video cache strategy - cache first for videos, with size limits
 */
async function videoCacheStrategy(request) {
  const cache = await caches.open(VIDEO_CACHE_NAME);
  const cached = await cache.match(request);

  // If cached, return immediately (videos are large, don't revalidate aggressively)
  if (cached) {
    console.log('[SW] Video cache hit:', request.url);
    return cached;
  }

  // Not cached, fetch from network
  try {
    console.log('[SW] Fetching video from network:', request.url);
    const response = await fetch(request);
    
    if (response.status === 200) {
      // Check cache size before adding video
      await enforceCacheSizeLimit(VIDEO_CACHE_NAME, MAX_VIDEO_CACHE_SIZE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Video fetch failed:', error);
    throw error;
  }
}

/**
 * Enforce cache size limits by removing oldest entries
 */
async function enforceCacheSizeLimit(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  // Calculate total cache size
  let totalSize = 0;
  const entries = [];
  
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const blob = await response.blob();
      const size = blob.size;
      totalSize += size;
      entries.push({ key, size, response });
    }
  }
  
  // If over limit, remove oldest entries (FIFO)
  if (totalSize > maxSize) {
    // Sort by key (which includes timestamp in some cases) or just remove oldest
    entries.sort((a, b) => a.size - b.size); // Remove smallest first to maximize space freed
    
    let freedSize = 0;
    for (const entry of entries) {
      if (totalSize - freedSize <= maxSize) break;
      await cache.delete(entry.key);
      freedSize += entry.size;
      console.log('[SW] Removed cache entry to free space:', entry.key.url);
    }
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

