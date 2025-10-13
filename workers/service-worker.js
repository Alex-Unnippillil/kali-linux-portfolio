const CACHE_PREFIX = 'periodic-cache';
const BUILD_ID_ENDPOINT = '/_next/static/BUILD_ID';
const FALLBACK_BUILD_ID = 'fallback';

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

let cacheNamePromise;

function sanitizeBuildId(raw) {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '-');
}

async function resolveCacheName() {
  if (!cacheNamePromise) {
    cacheNamePromise = (async () => {
      try {
        const response = await fetch(BUILD_ID_ENDPOINT, { cache: 'no-store' });
        if (response.ok) {
          const text = sanitizeBuildId(await response.text());
          if (text) {
            return `${CACHE_PREFIX}-${text}`;
          }
        }
      } catch (err) {
        // Ignore build ID resolution failures and fall back to a static name.
      }

      return `${CACHE_PREFIX}-${FALLBACK_BUILD_ID}`;
    })();
  }

  return cacheNamePromise;
}

async function openScopedCache() {
  const cacheName = await resolveCacheName();
  return caches.open(cacheName);
}

async function prefetchAssets() {
  const cache = await openScopedCache();
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
  event.waitUntil(
    prefetchAssets().then(() => self.skipWaiting && self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const currentCacheName = await resolveCacheName();
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (name) => name.startsWith(`${CACHE_PREFIX}-`) && name !== currentCacheName,
          )
          .map((name) => caches.delete(name)),
      );

      if (self.clients && self.clients.claim) {
        await self.clients.claim();
      }
    })(),
  );
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
      openScopedCache().then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (err) {
          const cached = await cache.match(request);
          if (cached) {
            return cached;
          }
          return caches.match(request);
        }
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
