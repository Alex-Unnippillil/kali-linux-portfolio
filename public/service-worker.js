importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const CACHE_NAME = 'weather-cache-v1';

// API requests use a network-first strategy so fresh data is preferred
// but cached responses are used when offline.
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://api.open-meteo.com',
  new workbox.strategies.NetworkFirst({
    cacheName: CACHE_NAME,
  })
);

// Cache site content (HTML, scripts, styles and images) with a
// stale-while-revalidate strategy. The cache is returned immediately and a
// network request updates the cache for future visits.
workbox.routing.registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    ['document', 'script', 'style', 'image'].includes(request.destination),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'content-cache',
  })
);

// Fonts and icon assets change infrequently. Use a cache-first strategy so
// they are served from cache and fetched again only if missing.
workbox.routing.registerRoute(
  ({ request, url }) =>
    request.destination === 'font' ||
    (request.destination === 'image' && /(?:icon|favicon)/.test(url.pathname)),
  new workbox.strategies.CacheFirst({
    cacheName: 'asset-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle messages for daily seed generation used by games.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'seed') {
    const seed = Math.random().toString(36).slice(2, 10);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ seed });
    }
  }
});
