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

const FLAG_DB_NAME = 'app-flags';
const FLAG_STORE_NAME = 'flags';
const FLAG_STATE_KEY = 'state';
const FLAG_DEFAULTS = { networkAccess: false };

function persistFlags(flags) {
  const next = { ...FLAG_DEFAULTS, ...(flags || {}) };
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FLAG_DB_NAME);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FLAG_STORE_NAME)) {
        db.createObjectStore(FLAG_STORE_NAME);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(FLAG_STORE_NAME, 'readwrite');
      tx.oncomplete = () => {
        db.close();
        resolve(next);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.objectStore(FLAG_STORE_NAME).put(next, FLAG_STATE_KEY);
    };
  });
}

async function handleRollback(flags) {
  const next = await persistFlags(flags);
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ type: 'kill-switch:update', state: next });
  });
}

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'refresh') {
    event.waitUntil(prefetchAssets());
  }
  if (event.data.type === 'rollback') {
    event.waitUntil(handleRollback(event.data.flags));
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
