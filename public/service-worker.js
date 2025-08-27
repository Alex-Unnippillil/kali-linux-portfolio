const SHELL_CACHE = 'shell-v1';
const DOCS_CACHE = 'docs-v1';
const DOC_URLS = [
  '/plugin-marketplace.json',
  '/reconng-marketplace.json',
  '/docs/architecture.md',
  '/docs/getting-started.md',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(SHELL_CACHE);
      // Cache the application shell
      await shellCache.add('/');
      const docsCache = await caches.open(DOCS_CACHE);
      await Promise.all(
        DOC_URLS.map((url) => docsCache.add(url).catch(() => undefined)),
      );
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/', response.clone());
          return response;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return cache.match('/') || Response.error();
        }
      })(),
    );
    return;
  }

  // Cache local JSON and markdown docs with a last-known-good strategy
  if (
    url.origin === self.location.origin &&
    (url.pathname.endsWith('.json') || url.pathname.endsWith('.md'))
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(DOCS_CACHE);
        try {
          const response = await fetch(request);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          throw new Error('Network error and no cached data');
        }
      })(),
    );
  }
});
