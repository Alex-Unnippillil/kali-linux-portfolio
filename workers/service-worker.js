const CACHE_NAME = 'periodic-cache-v1';
const GITHUB_CACHE = 'github-metadata-v1';
const GITHUB_TTL_MS = 24 * 60 * 60 * 1000;
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

  if (request.method === 'GET' && url.origin === 'https://api.github.com' && url.pathname.startsWith('/repos/')) {
    event.respondWith(handleGitHubRequest(request));
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

async function handleGitHubRequest(request) {
  const cache = await caches.open(GITHUB_CACHE);
  const cached = await cache.match(request);
  const now = Date.now();

  if (cached) {
    const fetchedHeader = cached.headers.get('sw-fetched-at');
    const fetchedAt = fetchedHeader ? Number(fetchedHeader) : undefined;
    if (typeof fetchedAt === 'number' && Number.isFinite(fetchedAt) && now - fetchedAt < GITHUB_TTL_MS) {
      return tagCachedResponse(cached, 'HIT');
    }
  }

  try {
    const networkResponse = await fetch(request);
    const buffered = await networkResponse.clone().arrayBuffer();
    const headers = new Headers(networkResponse.headers);
    headers.set('sw-fetched-at', String(Date.now()));
    headers.set('x-service-worker-cache', 'MISS');
    const responseForCache = new Response(buffered, {
      status: networkResponse.status,
      statusText: networkResponse.statusText,
      headers,
    });
    await cache.put(request, responseForCache.clone());
    return responseForCache;
  } catch (error) {
    if (cached) {
      return tagCachedResponse(cached, 'STALE');
    }
    throw error;
  }
}

async function tagCachedResponse(response, state) {
  const headers = new Headers(response.headers);
  headers.set('x-service-worker-cache', state);
  const body = await response.clone().arrayBuffer();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
