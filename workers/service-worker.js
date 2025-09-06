const CACHE_NAME = 'periodic-cache-v1';
const ASSETS = [
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

let disabled = false;

async function prefetchAssets() {
  if (disabled) return;
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

async function disableSw() {
  disabled = true;
  await self.registration.unregister();
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
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
  if (event.data && event.data.type === 'DISABLE_SW') {
    event.waitUntil(disableSw());
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (disabled) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.searchParams.get('nosw') === '1') {
    event.respondWith(fetch(request));
    event.waitUntil(disableSw());
    return;
  }

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
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
