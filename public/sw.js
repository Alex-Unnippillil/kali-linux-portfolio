const CACHE_NAME = 'kali-cache-v1';
const OFFLINE_URL = '/offline.html';
const OFFLINE_ASSETS = ['/offline.html', '/offline.css', '/offline.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  const isStyle = request.destination === 'style';
  const isScript = request.destination === 'script';
  const isWallpaper = request.url.includes('/wallpapers/');

  if (isStyle || isScript || isWallpaper) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        try {
          const response = await fetch(request);
          cache.put(request, response.clone());
          return response;
        } catch (err) {
          if (cached) return cached;
          throw err;
        }
      })
    );
  }
});

