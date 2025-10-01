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

async function prefetchAssets() {
  const cache = await caches.open(CACHE_NAME);
  const results = await Promise.all(
    ASSETS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) {
          await cache.put(url, response.clone());
          return { url, ok: true };
        }
        return { url, ok: false };
      } catch (err) {
        return { url, ok: false };
      }
    }),
  );

  const failed = results.filter((result) => !result.ok).map((result) => result.url);
  return { failed };
}

async function broadcastSyncResult(result) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({
      type: 'PERIODIC_SYNC_RESULT',
      ...result,
    });
  }
}

async function runPrefetch(trigger) {
  const timestamp = Date.now();
  try {
    const { failed } = await prefetchAssets();
    await broadcastSyncResult({
      status: failed.length ? 'partial' : 'success',
      failed: failed.length ? failed : undefined,
      trigger,
      timestamp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await broadcastSyncResult({
      status: 'error',
      message,
      trigger,
      timestamp,
    });
    throw error;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(runPrefetch('install'));
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(runPrefetch('periodic'));
  }
});

self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  if (event.data.type === 'refresh') {
    event.waitUntil(runPrefetch('refresh'));
  } else if (event.data.type === 'run-sync') {
    const trigger = event.data.trigger || 'manual';
    event.waitUntil(runPrefetch(trigger));
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
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
