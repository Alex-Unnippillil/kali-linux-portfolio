const CACHE_NAME = 'game-cache-v1';
const CORE_ASSETS = [
  '/',
  '/apps/sokoban',
  '/apps/word_search',
  '/apps/password_generator',
  '/apps/phaser_matter'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((resp) => resp || fetch(event.request))
  );
});

// IndexedDB helpers for per-game daily seeds
const DB_NAME = 'kali-games';
const STORE_SEEDS = 'seeds';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SEEDS)) {
        db.createObjectStore(STORE_SEEDS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getSeed(game, date) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SEEDS, 'readonly');
    const req = tx.objectStore(STORE_SEEDS).get(`${game}-${date}`);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
}

async function setSeed(game, date, seed) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SEEDS, 'readwrite');
    tx.objectStore(STORE_SEEDS).put(seed, `${game}-${date}`);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'seed') {
    const { game, date } = data;
    event.waitUntil(
      (async () => {
        let seed = await getSeed(game, date);
        if (!seed) {
          seed = Math.random().toString(36).slice(2, 10);
          await setSeed(game, date, seed);
        }
        event.ports[0].postMessage({ seed });
      })()
    );
  }
});

