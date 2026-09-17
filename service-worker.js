// GIRO Angola Service Worker — PWA Ultra-Leve Angola-First
// Cache First strategy: serve from cache immediately, update in background
const CACHE_NAME = 'giro-cache-v3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './driver.html',
  './central.html',
  './login.html',
  './cadastro-passageiro.html',
  './cadastro-motorista.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];

// Install — pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // Don't block install on missing icons
  );
});

// Activate — delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — Cache First for HTML/assets, Network First for API calls
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip cross-origin, non-GET, and API requests
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Cache First: respond immediately from cache, update in background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);

      // Return cache immediately if available, else wait for network
      return cached || fetchPromise || caches.match('./index.html');
    })
  );
});
