const CACHE_NAME = 'kali-portfolio-core-v1';
const CORE_ASSETS = ['/', '/manifest.webmanifest', '/a2hs.js', '/favicon.ico'];

const withCacheHeader = (response) => {
  const headers = new Headers(response.headers);
  headers.set('x-sw-cache', 'hit');
  return new Response(response.clone().body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(CORE_ASSETS);
      } finally {
        self.skipWaiting();
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        }),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return withCacheHeader(cachedResponse);
      }

      try {
        const response = await fetch(request);
        const requestURL = new URL(request.url);

        if (requestURL.origin === self.location.origin && response.status === 200) {
          cache.put(request, response.clone()).catch(() => {});
        }

        return response;
      } catch (error) {
        if (cachedResponse) {
          return withCacheHeader(cachedResponse);
        }
        throw error;
      }
    })(),
  );
});

