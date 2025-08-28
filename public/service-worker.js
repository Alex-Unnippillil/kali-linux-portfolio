const CACHE_NAME = 'weather-cache-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  if (request.url.startsWith('https://api.open-meteo.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request);
          cache.put(request, response.clone());
          return response;
        } catch (err) {
          const cached = await cache.match(request);
          if (cached) return cached;
          throw err;
        }
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'seed') {
    const seed = Math.random().toString(36).slice(2, 10);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ seed });
    }
  }
});
