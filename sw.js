/**
 * SubPaperz Service Worker
 * Cache name: subpaperz-v1
 *
 * Strategy:
 *   - App shell files: cache-first (serve from cache, update in background)
 *   - API / Supabase requests: network-first (try network, fall back to cache)
 *   - Everything else: network-first with cache fallback
 */

const CACHE_NAME = 'subpaperz-v1';
const RUNTIME_CACHE = 'subpaperz-runtime-v1';

// App shell files to pre-cache on install
const PRECACHE_URLS = [
  '/index.html',
  '/app/index.html',
  '/app/dashboard.html',
  '/css/app.css',
  '/manifest.json',
  '/js/config.js',
  '/js/supabase-client.js',
  '/js/auth.js',
  '/js/nav.js',
  '/js/plan.js',
  '/js/utils.js',
];

// Domains/paths that should always go network-first
const NETWORK_FIRST_PATTERNS = [
  'supabase.co',
  'supabase.in',
  'stripe.com',
  'formspree.io',
  '/js/config.js',  // config may update
];

function isNetworkFirst(url) {
  return NETWORK_FIRST_PATTERNS.some(pattern => url.includes(pattern));
}

// ─── Install: pre-cache app shell ────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache files individually so a single 404 doesn't break install
        return Promise.allSettled(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to precache ${url}:`, err.message);
            })
          )
        );
      })
      .then(() => {
        // Skip waiting: activate immediately
        return self.skipWaiting();
      })
  );
});

// ─── Activate: clean old caches, claim clients ───────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: route requests ────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s) requests
  if (!url.startsWith('http')) return;

  if (isNetworkFirst(url)) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

// Cache-first: serve from cache, fall back to network + update cache
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Refresh in background (stale-while-revalidate)
    refreshCache(request);
    return cachedResponse;
  }
  return fetchAndCache(request);
}

// Network-first: try network, fall back to cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request.clone());
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const appShell = await caches.match('/app/index.html');
      if (appShell) return appShell;
    }
    return new Response('Offline — please check your connection.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Fetch a request and store it in the runtime cache
async function fetchAndCache(request) {
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Return offline page for navigation
    if (request.mode === 'navigate') {
      const cached = await caches.match('/app/index.html') || await caches.match('/index.html');
      if (cached) return cached;
    }
    return new Response('Network error.', { status: 503 });
  }
}

// Silently update a cached resource in the background
function refreshCache(request) {
  fetch(request.clone())
    .then(response => {
      if (response.ok) {
        caches.open(CACHE_NAME).then(cache => cache.put(request, response));
      }
    })
    .catch(() => {}); // Ignore background refresh failures
}

// ─── Message handler (e.g. force-refresh from app) ───────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => caches.delete(RUNTIME_CACHE));
  }
});
