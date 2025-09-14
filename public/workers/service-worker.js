// Custom service worker for Kali Linux Portfolio
// Precaches core assets and handles offline scenarios.

const CACHE_NAME = 'app-core-v1';
const CORE_ASSETS = [
  '/',
  '/offline.html',
  '/offline.css',
  '/offline.js',
  '/manifest.webmanifest',
];

async function cacheCoreAssets() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(CORE_ASSETS);
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheCoreAssets());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(async () => cached || cache.match('/offline.html'));
        return cached || networkFetch;
      })(),
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = {};
  }

  const title = data.title || 'Notification';
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: { url: data.url },
  };

  event.waitUntil(
    (async () => {
      if ('setAppBadge' in self.registration && data.badgeCount) {
        try {
          await self.registration.setAppBadge(data.badgeCount);
        } catch {
          // Ignore badge errors
        }
      }

      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url;
  if (!url) return;

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        await clients.openWindow(url);
      }
    })(),
  );
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-inbox') {
    event.waitUntil(fetch('/api/inbox').catch(() => {}));
  }
});

self.addEventListener('message', (event) => {
  const type = event.data && (event.data.type || event.data);
  if (type === 'CLEAR_BADGE' && 'clearAppBadge' in self.registration) {
    event.waitUntil(self.registration.clearAppBadge().catch(() => {}));
  }
});

