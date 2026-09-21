// GIRO Angola Service Worker — PWA Live (Network First for HTML, Push & Auto-Purge)
const CACHE_NAME = 'giro-live-v2026-v5-firebase-suite';

// Pre-cache core offline shell para PWA e Google Play / Chromium compliance
const PRECACHE_ASSETS = [
  './index.html',
  './driver.html',
  './passenger.html',
  './login.html',
  './manifest.json',
  './manifest-driver.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.ico',
  './leaflet.css',
  './leaflet.js',
  './telemetry.js'
];

// Install — pre-cache offline shell e forçar ativação imediata
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[SW] Pre-cache parcial (offline pronto):', err);
      });
    }).then(() => self.skipWaiting())
  );
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
        .catch(() => caches.match(req).then(cached => {
          if (cached) return cached;
          if (url.pathname.includes('driver')) {
            return caches.match('./driver.html') || caches.match('driver.html');
          }
          return caches.match('./index.html') || caches.match('index.html');
        }))
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

// Push Notifications — Suporte a notificações nativas do sistema com tag e ações
self.addEventListener('push', event => {
  let data = {
    title: 'GIRO — Nova Corrida Disponível!',
    body: 'Nova corrida solicitada próxima de si.',
    url: '/driver.html',
    tag: 'giro-ride-request'
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        data = Object.assign(data, parsed);
      }
    }
  } catch (e) {
    try {
      const text = event.data ? event.data.text() : null;
      if (text) {
        data.body = text;
      }
    } catch (err) {}
  }

  const title = data.title || 'GIRO — Nova Corrida Disponível!';

  const options = {
    body: data.body || 'Nova solicitação de corrida disponível.',
    icon: data.icon || './icons/icon-192.png',
    badge: data.badge || './icons/icon-192.png',
    tag: data.tag || 'giro-ride-request',
    renotify: data.renotify !== undefined ? data.renotify : true,
    requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : true,
    vibrate: data.vibrate || [200, 100, 200, 100, 400],
    data: Object.assign({
      url: data.url || '/driver.html',
      rideId: data.rideId || null,
      timestamp: Date.now()
    }, data),
    actions: (data.actions && Array.isArray(data.actions) && data.actions.length > 0)
      ? data.actions
      : [
          { action: 'accept', title: 'Aceitar Corrida' },
          { action: 'dismiss', title: 'Recusar' }
        ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click — Tratamento de ações (aceitar/recusar) e foco/abertura de janela
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const action = event.action;
  const targetUrl = notifData.url || '/driver.html';

  // Se o motorista clicou em Recusar / Dispensar
  if (action === 'dismiss') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        for (const client of windowClients) {
          if (client.url.includes('/driver.html') || client.url.includes('driver.html')) {
            client.postMessage({
              type: 'GIRO_RIDE_NOTIFICATION_ACTION',
              action: 'dismiss',
              rideId: notifData.rideId || null
            });
          }
        }
      })
    );
    return;
  }

  // Se o motorista clicou em Aceitar ou no corpo da notificação
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // 1. Procurar janela existente do motorista ou correspondente ao targetUrl
      for (const client of windowClients) {
        const matchesTarget = client.url.includes(targetUrl) || 
                              (targetUrl.includes('driver.html') && client.url.includes('driver.html'));
        if (matchesTarget && 'focus' in client) {
          if (action === 'accept') {
            client.postMessage({
              type: 'GIRO_RIDE_NOTIFICATION_ACTION',
              action: 'accept',
              rideId: notifData.rideId || null,
              data: notifData
            });
          }
          return client.focus();
        }
      }

      // 2. Se não houver janela aberta correspondente, abrir nova janela
      if (clients.openWindow) {
        let openUrl = targetUrl;
        if (action === 'accept') {
          const sep = openUrl.indexOf('?') >= 0 ? '&' : '?';
          const rideParam = notifData.rideId ? '&rideId=' + encodeURIComponent(notifData.rideId) : '';
          openUrl = openUrl + sep + 'action=accept' + rideParam;
        }
        return clients.openWindow(openUrl);
      }
    })
  );
});
