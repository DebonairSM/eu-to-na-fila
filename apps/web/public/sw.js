/**
 * Service Worker for EuTôNaFila PWA
 * 
 * Provides offline support by caching static assets and API responses.
 * Auto-updates when new version is deployed.
 */

// #region agent log
// No-op: avoid fetch to localhost ingest; it violates document CSP in production.
function dbg() {}
// #endregion

// Bump this when deploying changes that affect built asset graphs.
// A stale cached HTML/JS combo is the most common cause of "blank black screen" after deploy.
const CACHE_VERSION = 'v8';

const STATIC_CACHE_NAME = `eutonafila-static-${CACHE_VERSION}`;
const PAGE_CACHE_NAME = `eutonafila-pages-${CACHE_VERSION}`;
const API_CACHE_NAME = `eutonafila-api-${CACHE_VERSION}`;
const VIDEO_CACHE_NAME = `eutonafila-video-${CACHE_VERSION}`;

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
  console.log('[SW] Installing service worker', CACHE_VERSION, '(cross-origin skip fix)');
  
  event.waitUntil(
    caches.open(PAGE_CACHE_NAME).then((cache) => {
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
          .filter((name) => name !== STATIC_CACHE_NAME && name !== PAGE_CACHE_NAME && name !== API_CACHE_NAME && name !== VIDEO_CACHE_NAME)
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
          client.postMessage({ type: 'SW_ACTIVATED', cacheVersion: CACHE_VERSION });
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

    // Skip external storage URLs (S3, R2, CDN, etc.) - let browser handle directly
    // These are cross-origin and shouldn't be cached by service worker to avoid CSP violations
    const isExternalStorage = url.origin !== self.location.origin && 
      (url.hostname.includes('s3') || 
       url.hostname.includes('r2') || 
       url.hostname.includes('amazonaws.com') ||
       url.hostname.includes('cloudflarestorage.com') ||
       url.hostname.includes('r2.dev') ||
       (url.hostname === 'localhost' && url.port === '9000'));
    
    if (isExternalStorage) {
      // Don't intercept external storage requests - let browser handle them directly
      // This prevents CSP violations when service worker tries to fetch them
      // #region agent log
      dbg('sw.js:fetch', 'skip external storage', { url: request.url }, 'H2');
      // #endregion
      return;
    }

    // Don't intercept ad media (GET /api/ads/:id/media) - let browser handle directly.
    // SW fetch() can fail for range requests (video), binary responses, or network issues,
    // causing "Failed to fetch" and breaking kiosk ad display on tablets/laptops.
    if (/^\/api\/ads\/\d+\/media$/.test(url.pathname)) {
      return;
    }

    // Don't intercept ads public manifest - let browser fetch directly so we always get
    // a fresh manifest and the page's timeout applies. Avoids stale cache and "fetching but no ads".
    if (url.pathname === '/api/ads/public/manifest') {
      return;
    }

    // Handle API requests (network first, fallback to cache)
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(apiNetworkFirstStrategy(request));
      return;
    }

    // Handle video files with separate cache
    if (url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm') || url.pathname.endsWith('.ogg')) {
      event.respondWith(videoCacheStrategy(request));
      return;
    }

    // HTML navigation: network-first, cache in PAGE cache.
    // This prevents stale HTML pointing at missing hashed bundles (blank screen after deploy).
    if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
      event.respondWith(pageNetworkFirstStrategy(request));
      return;
    }
    
    // Handle static assets
    // Don't intercept cross-origin requests (fonts, CDNs, etc.). Let the browser handle them.
    // SW fetch() is subject to connect-src; document-initiated link/style/font use style-src/font-src.
    // Intercepting and fetching here causes "Refused to connect" CSP errors on cold load / refresh.
    if (url.origin !== self.location.origin) {
      console.log('[SW] skip cross-origin (no intercept):', request.url);
      return;
    }
    
    // For hashed JS/CSS files (e.g., main-abc123.js), use network-first
    // These are content-addressed - if they exist in cache, they're correct
    // But if network has a new version, we need it (old version may reference missing chunks)
    const isHashedAsset = /\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname) ||
                          /-([\w]{8,})\.(js|css)$/.test(url.pathname);
    
    if (isHashedAsset) {
      console.log('[SW] Network-first for hashed asset:', request.url);
      event.respondWith(hashedAssetStrategy(request));
      return;
    }
    
    // Other static assets (images, fonts) - cache first
    console.log('[SW] staticStrategy same-origin:', request.url);
    event.respondWith(staticCacheFirstStrategy(request));
  } catch (error) {
    // Skip requests that can't be parsed as URLs
    console.warn('[SW] Skipping invalid URL:', request.url);
    return;
  }
});

/**
 * Network-first strategy for hashed assets (JS/CSS with content hashes)
 * These files are immutable - if we have them cached, they're correct
 * But we prefer network to ensure we have the latest version graph
 */
async function hashedAssetStrategy(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      // Cache the response for offline use
      cache.put(request, response.clone());
      return response;
    }
    
    // 404 means this chunk doesn't exist (likely after deploy)
    // This is a strong signal that cached HTML is stale
    if (response.status === 404) {
      console.warn('[SW] Chunk not found (404):', request.url);
      notifyChunkError(request.url);
      
      // Try cache as fallback (might work if it's an old chunk that still exists locally)
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('[SW] Network failed, using cached hashed asset:', request.url);
      return cached;
    }
    
    // No cache, throw error (will trigger chunk loading retry in app)
    console.error('[SW] Hashed asset not available:', request.url);
    throw error;
  }
}

/**
 * Cache-first strategy for static assets (images, fonts, etc.)
 * Used for assets that don't have content hashes and are less critical
 */
async function staticCacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cached = await cache.match(request);

  // If cached, return immediately and update in background
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    
    // Update cache in background (stale-while-revalidate)
    fetch(request).then((response) => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
    }).catch(() => {
      // Ignore background update errors
    });
    
    return cached;
  }

  // No cache, fetch from network
  try {
    console.log('[SW] Fetching from network:', request.url);
    const response = await fetch(request);
    
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

/**
 * Network-first strategy for HTML navigation (cache in PAGE cache)
 */
async function pageNetworkFirstStrategy(request) {
  const cache = await caches.open(PAGE_CACHE_NAME);

  try {
    console.log('[SW] Fetching page from network:', request.url);
    const response = await fetch(request);
    
    // Cache successful page responses
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
 * Network-first strategy for API requests
 * Always try network first, fallback to cache if offline
 */
async function apiNetworkFirstStrategy(request) {
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
  
  // Force update check
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    self.registration.update();
  }
});

/**
 * Notify clients when a chunk/asset returns 404 (likely stale cache issue)
 */
function notifyChunkError(url) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ 
        type: 'CHUNK_NOT_FOUND', 
        url: url,
        cacheVersion: CACHE_VERSION 
      });
    });
  });
}

