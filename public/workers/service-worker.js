import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

const PREFETCH_CACHE = 'periodic-cache-v2';
const PREFETCH_URLS = [
  '/',
  '/apps',
  '/apps/weather',
  '/apps/terminal',
  '/apps/checkers',
  '/notes',
  '/profile',
  '/projects.json',
  '/offline.html',
  '/manifest.webmanifest',
];

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

async function prefetchAssets() {
  const cache = await caches.open(PREFETCH_CACHE);
  await Promise.all(
    PREFETCH_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) {
          await cache.put(url, response.clone());
        }
      } catch (err) {
        // Ignore individual failures.
      }
    }),
  );
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(prefetchAssets());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(prefetchAssets());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'refresh') {
    event.waitUntil(prefetchAssets());
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/apps/')) {
    event.respondWith(
      caches.open(PREFETCH_CACHE).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          const cached = await cache.match(request);
          if (cached) {
            return cached;
          }
          return cache.match('/offline.html');
        }
      }),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(PREFETCH_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          const cache = await caches.open(PREFETCH_CACHE);
          return (await cache.match(request)) || cache.match('/offline.html');
        }
      })(),
    );
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
