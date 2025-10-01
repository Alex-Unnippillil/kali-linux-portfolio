const SHORTCUT_DB_NAME = 'kali-shortcuts';
const SHORTCUT_STORE = 'shortcuts';
const MANIFEST_CACHE = 'shortcut-manifest-v1';
const MANIFEST_URL = '/manifest.webmanifest';
const MANIFEST_LIMIT = 4;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(MANIFEST_CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await refreshShortcutsFromDb();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.type === 'shortcuts:refresh') {
    event.waitUntil(refreshShortcutsFromDb());
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.pathname.endsWith('manifest.webmanifest')) {
    event.respondWith(
      caches.open(MANIFEST_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          cache.put(request, response.clone()).catch(() => {});
          return response;
        } catch (error) {
          return cached ?? Response.error();
        }
      }),
    );
  }
});

const openShortcutDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(SHORTCUT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SHORTCUT_STORE)) {
        db.createObjectStore(SHORTCUT_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readShortcutRecords = (db) =>
  new Promise((resolve, reject) => {
    const tx = db.transaction(SHORTCUT_STORE, 'readonly');
    const store = tx.objectStore(SHORTCUT_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error);
  });

const sortShortcuts = (records) =>
  [...records]
    .filter((entry) => entry && entry.manifest)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const aScore = typeof a.lastUsed === 'number' ? a.lastUsed : 0;
      const bScore = typeof b.lastUsed === 'number' ? b.lastUsed : 0;
      return bScore - aScore;
    });

const readBaseManifest = async () => {
  try {
    const response = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    // fall back to cache
  }
  try {
    const cache = await caches.open(MANIFEST_CACHE);
    const cached = await cache.match(MANIFEST_URL);
    if (cached) {
      return await cached.json();
    }
  } catch (error) {
    // ignore cache failures
  }
  return null;
};

const updateClients = async (records) => {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const payload = {
    type: 'shortcuts-updated',
    count: records.filter((entry) => entry.pinned).length,
    shortcuts: records.map((entry) => ({ id: entry.id, pinned: entry.pinned })),
  };
  for (const client of clients) {
    client.postMessage(payload);
  }
};

const refreshShortcutsFromDb = async () => {
  if (typeof indexedDB === 'undefined') return;
  let db;
  try {
    db = await openShortcutDb();
  } catch (error) {
    return;
  }
  if (!db) return;

  let records;
  try {
    records = await readShortcutRecords(db);
  } catch (error) {
    db.close();
    return;
  }
  db.close();

  const sorted = sortShortcuts(records).slice(0, MANIFEST_LIMIT);
  if (!sorted.length) {
    if (self.registration && self.registration.clearAppBadge) {
      self.registration.clearAppBadge().catch(() => {});
    }
    await updateClients([]);
    return;
  }

  const manifest = (await readBaseManifest()) || {};
  const shortcuts = sorted.map((entry) => ({
    ...entry.manifest,
    integrity: entry.integrity,
  }));

  manifest.shortcuts = shortcuts;

  try {
    const cache = await caches.open(MANIFEST_CACHE);
    const response = new Response(JSON.stringify(manifest, null, 2), {
      headers: { 'Content-Type': 'application/manifest+json' },
    });
    await cache.put(new Request(MANIFEST_URL), response);
  } catch (error) {
    // ignore cache write failures
  }

  if (self.registration && self.registration.setAppBadge) {
    const pinnedCount = shortcuts.filter((entry, index) => sorted[index].pinned).length;
    if (pinnedCount > 0) {
      self.registration.setAppBadge(pinnedCount).catch(() => {});
    } else if (self.registration.clearAppBadge) {
      self.registration.clearAppBadge().catch(() => {});
    }
  }

  await updateClients(sorted);
};
