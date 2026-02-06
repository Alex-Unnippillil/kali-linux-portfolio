const CACHE_NAME = 'periodic-cache-v1';
const ASSETS = [
  '/',
  '/apps/weather.js',
  '/feeds',
  '/about',
  '/projects',
  '/projects.json',
  '/apps',
  '/apps/weather',
  '/apps/terminal',
  '/apps/checkers',
  '/offline.html',
  '/manifest.webmanifest',
];

async function prefetchAssets() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    ASSETS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) {
          await cache.put(url, response.clone());
        }
      } catch (err) {
        // Ignore individual failures
      }
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(prefetchAssets());
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

  if (url.pathname.startsWith('/apps/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (err) {
          return cache.match(request);
        }
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      try {
        return cached || (await fetch(request));
      } catch (err) {
        if (
          request.mode === 'navigate' ||
          request.destination === 'document'
        ) {
          return caches.match('/offline.html');
        }
        return cached;
      }
    }),
  );
});
