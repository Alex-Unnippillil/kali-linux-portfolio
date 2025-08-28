importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');
/* global workbox */

const bgSyncPlugin = new workbox.backgroundSync.Plugin('offline-queue', {
  maxRetentionTime: 24 * 60,
});

workbox.routing.registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin && request.method === 'POST',
  new workbox.strategies.NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

const CACHE_NAME = 'weather-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
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
