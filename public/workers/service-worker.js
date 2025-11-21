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

const FALLBACK_HTML = '/offline.html';
const DOCUMENTATION_PREFIXES = ['/docs', '/documentation'];
const SIMULATOR_PREFIXES = ['/apps', '/simulators'];

const normalizePath = (path) => {
  if (!path) return '/';
  if (path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
};

const matchesPrefix = (path, prefixes) => {
  const normalizedPath = normalizePath(path);
  return prefixes.some((prefixRaw) => {
    const prefix = normalizePath(prefixRaw);
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  });
};

const expectsHtml = (request) => {
  if (request.mode === 'navigate') return true;
  const acceptHeader = request.headers.get('accept') || '';
  return acceptHeader.includes('text/html');
};

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

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isDocumentationRoute = matchesPrefix(url.pathname, DOCUMENTATION_PREFIXES);
  const isSimulatorRoute = matchesPrefix(url.pathname, SIMULATOR_PREFIXES);

  if (isDocumentationRoute || isSimulatorRoute) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch (err) {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          if (expectsHtml(request)) {
            const fallback = await cache.match(FALLBACK_HTML);
            if (fallback) {
              return fallback;
            }
          }

          return new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
