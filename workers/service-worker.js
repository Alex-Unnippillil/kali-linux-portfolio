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

const QUEUE_DB_NAME = 'action-queue';
const QUEUE_STORE_NAME = 'pendingActions';
const CONTACT_QUEUE_TAG = 'contact-submission';
const CONTACT_SYNC_TAG = 'contact-sync';

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

function openQueueDatabase() {
  return new Promise((resolve) => {
    if (!('indexedDB' in self)) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(QUEUE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        const store = db.createObjectStore(QUEUE_STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('type', 'type', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function getQueuedContactActions() {
  const db = await openQueueDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    const transaction = db.transaction(QUEUE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(QUEUE_STORE_NAME);
    const handleResult = (request) => {
      request.onsuccess = () => {
        const items = request.result || [];
        const filtered = items.filter((item) => item.type === CONTACT_QUEUE_TAG);
        resolve(filtered);
      };
      request.onerror = () => resolve([]);
    };

    if (store.indexNames.contains('type')) {
      const index = store.index('type');
      handleResult(index.getAll(IDBKeyRange.only(CONTACT_QUEUE_TAG)));
    } else {
      handleResult(store.getAll());
    }
  });
}

async function deleteQueuedAction(id) {
  const db = await openQueueDatabase();
  if (!db) return;

  await new Promise((resolve) => {
    const transaction = db.transaction(QUEUE_STORE_NAME, 'readwrite');
    transaction.objectStore(QUEUE_STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => resolve();
    transaction.onerror = () => resolve();
  });
}

async function broadcastQueueUpdate() {
  const clientsList = await self.clients.matchAll({ type: 'window' });
  clientsList.forEach((client) => {
    client.postMessage({ type: 'contact-queue-updated' });
  });
}

async function processQueuedContactSubmissions() {
  const queued = await getQueuedContactActions();
  if (!queued.length) {
    await broadcastQueueUpdate();
    return;
  }

  const results = await Promise.all(
    queued.map(async (entry) => {
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': entry.payload?.csrfToken,
          },
          body: JSON.stringify(entry.payload?.requestBody ?? {}),
        });
        if (response.ok) {
          await deleteQueuedAction(entry.id);
          return true;
        }
      } catch (err) {
        // Keep for retry
      }
      return false;
    }),
  );

  if (results.some((status) => status)) {
    await broadcastQueueUpdate();
  }
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
    return;
  }
  if (event.data && event.data.type === 'contact-queue-updated') {
    event.waitUntil(broadcastQueueUpdate());
    return;
  }
  if (event.data && event.data.type === 'flush-contact-queue') {
    event.waitUntil(processQueuedContactSubmissions());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === CONTACT_SYNC_TAG) {
    event.waitUntil(processQueuedContactSubmissions());
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
