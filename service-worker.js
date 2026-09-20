// GIRO Angola Service Worker — PWA Live (Network First for HTML, Push & Auto-Purge)
const CACHE_NAME = 'giro-live-v2026-v5-firebase-suite';

// Install — forçar ativação imediata sem esperar fechar abas
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate — eliminar TODOS os caches antigos
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

// Push Notifications — Suporte a notificações nativas do sistema
self.addEventListener('push', event => {
  let data = { title: 'GIRO Angola', body: 'Nova atualização na sua viagem.', url: './' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch(e) {
    data.body = event.data ? event.data.text() : data.body;
  }

  const options = {
    body: data.body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || './' },
    actions: [
      { action: 'open', title: 'Abrir App' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'GIRO Angola', options)
  );
});

// Ao clicar na notificação, abrir ou focar a janela do app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
