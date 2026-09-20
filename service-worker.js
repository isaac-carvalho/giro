// GIRO Angola Service Worker — PWA Live (Network First for HTML & Auto-Purge)
const CACHE_NAME = 'giro-live-v2026-v4-uber-sync';

// Install — forçar ativação imediata sem esperar fechar abas
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate — eliminar TODOS os caches antigos (v1, v2, v3, etc.)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) {
            console.log('[SW] Apagando cache antigo:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch — Network-First estrito para páginas HTML (sempre busca a versão mais recente)
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Se for navegação ou requisição de página HTML: SEMPRE buscar na rede primeiro!
  const isHtml = req.mode === 'navigate' || 
                 (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) ||
                 url.pathname.endsWith('.html') || 
                 url.pathname.endsWith('/');

  if (isHtml) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(networkRes => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Para assets estáticos (ícones, sons): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then(cached => {
      const netPromise = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => null);

      return cached || netPromise;
    })
  );
});
