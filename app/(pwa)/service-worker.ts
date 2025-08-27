/// <reference lib="webworker" />

const CACHE_NAME = 'pwa-cache-v1';
const STATIC_ASSETS = ['/', '/manifest.json'];

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([...STATIC_ASSETS, '/demo-data/sample.json']))
  );
  // Activate worker immediately after installation
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil((self as unknown as ServiceWorkerGlobalScope).clients.claim());
});

self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/demo-data/') || STATIC_ASSETS.includes(url.pathname)) {
      event.respondWith(
        caches.match(event.request).then((response) => {
          if (response) return response;
          return fetch(event.request).then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
            return res;
          });
        })
      );
    }
  }
});

export default null;
