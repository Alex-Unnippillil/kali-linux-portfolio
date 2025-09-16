const CACHE_NAME = 'refresh-feeds-cache-v1';
const REFRESH_TAG = 'refresh-feeds';
const FEED_ENDPOINTS = [
  '/feeds',
  '/about',
  '/projects',
  '/projects.json',
  '/data/module-index.json',
  '/data/module-version.json',
  '/data/pacman-leaderboard.json',
  '/data/milestones.json',
  '/apps',
  '/apps/weather',
  '/apps/terminal',
  '/apps/checkers',
  '/apps/weather.js',
  '/offline.html',
  '/manifest.webmanifest',
];

async function refreshFeeds() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    FEED_ENDPOINTS.map(async (url) => {
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
  event.waitUntil(refreshFeeds());
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === REFRESH_TAG) {
    event.waitUntil(refreshFeeds());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'refresh' || event.data.type === REFRESH_TAG)) {
    event.waitUntil(refreshFeeds());
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
