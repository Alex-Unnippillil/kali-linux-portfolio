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
const METADATA_KEY = '__asset-metadata__';
const STORAGE_WARNING_THRESHOLD = 0.8;
const WARNING_BUCKET_SIZE = 5; // percent bucket size
const EVICTION_THRESHOLD = 0.95;

let lastWarningBucket = null;

const globalNavigator = /** @type {typeof navigator | undefined} */ (self.navigator);

const toAbsoluteUrl = (input) => {
  if (typeof input === 'string') {
    try {
      return new URL(input, self.location.origin).href;
    } catch {
      return input;
    }
  }
  return input.url;
};

const toRequest = (input) => (typeof input === 'string' ? new Request(input) : input);

const readMetadata = async (cache) => {
  try {
    const stored = await cache.match(METADATA_KEY);
    if (!stored) return {};
    return await stored.json();
  } catch {
    return {};
  }
};

const writeMetadata = async (cache, metadata) => {
  try {
    await cache.put(
      METADATA_KEY,
      new Response(JSON.stringify(metadata), {
        headers: { 'content-type': 'application/json' },
      }),
    );
  } catch {
    // Ignore metadata persistence issues
  }
};

const broadcastMessage = async (message) => {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clients.forEach((client) => {
      try {
        client.postMessage(message);
      } catch {
        // Ignore messaging issues per client
      }
    });
  } catch {
    // Ignore broadcast failures
  }
};

const getStorageEstimate = async () => {
  const storage = globalNavigator?.storage;
  if (!storage?.estimate) return null;
  try {
    return await storage.estimate();
  } catch {
    return null;
  }
};

const warnIfNeeded = async (estimate) => {
  try {
    const data = estimate || (await getStorageEstimate());
    if (!data) return;
    const { usage = 0, quota } = data;
    if (!quota || quota <= 0 || !Number.isFinite(quota)) return;
    const ratio = usage / quota;
    if (!Number.isFinite(ratio) || ratio < STORAGE_WARNING_THRESHOLD) return;
    const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    const bucket = Math.floor(percent / WARNING_BUCKET_SIZE);
    if (lastWarningBucket === bucket) return;
    lastWarningBucket = bucket;
    await broadcastMessage({ type: 'storage-warning', usage, quota });
  } catch {
    // Ignore warning failures
  }
};

const enforceLRU = async (cache, metadata, initialEstimate) => {
  const removed = [];
  try {
    let estimate = initialEstimate || (await getStorageEstimate());
    if (!estimate) return removed;
    let { usage = 0, quota } = estimate;
    if (!quota || quota <= 0 || !Number.isFinite(quota)) return removed;
    const entries = Object.entries(metadata).sort(([, aTs], [, bTs]) => aTs - bTs);
    for (const [key] of entries) {
      if (!key || key === METADATA_KEY) continue;
      if (usage / quota < EVICTION_THRESHOLD) break;
      try {
        const deleted = await cache.delete(key);
        if (deleted) {
          delete metadata[key];
          removed.push(key);
          estimate = (await getStorageEstimate()) || estimate;
          usage = estimate.usage ?? usage;
          quota = estimate.quota ?? quota;
        }
      } catch {
        // ignore deletion errors
      }
    }
    if (removed.length) {
      await writeMetadata(cache, metadata);
      await broadcastMessage({ type: 'cache-evicted', urls: removed });
    }
  } catch {
    // ignore eviction issues
  }
  return removed;
};

const touchEntry = async (cache, requestInfo) => {
  try {
    const key = toAbsoluteUrl(requestInfo);
    if (!key || key === METADATA_KEY) return;
    const metadata = await readMetadata(cache);
    metadata[key] = Date.now();
    await writeMetadata(cache, metadata);
  } catch {
    // ignore access update issues
  }
};

const cacheResponse = async (cache, requestInfo, response) => {
  const request = toRequest(requestInfo);
  try {
    await cache.put(request, response.clone());
  } catch {
    return;
  }
  try {
    const metadata = await readMetadata(cache);
    const key = toAbsoluteUrl(requestInfo);
    if (!key || key === METADATA_KEY) return;
    metadata[key] = Date.now();
    await writeMetadata(cache, metadata);
    const estimate = await getStorageEstimate();
    await warnIfNeeded(estimate);
    await enforceLRU(cache, metadata, estimate);
  } catch {
    // ignore metadata update issues
  }
};

async function prefetchAssets() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    ASSETS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) {
          await cacheResponse(cache, url, response);
        }
      } catch {
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
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cacheResponse(cache, request, response);
          }
          return response;
        } catch (err) {
          const cached = await cache.match(request);
          if (cached) {
            await touchEntry(cache, request);
            return cached;
          }
          throw err;
        }
      }),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) {
        await touchEntry(cache, request);
        return cached;
      }
      try {
        return await fetch(request);
      } catch (err) {
        const fallback = await caches.match(request);
        if (fallback) return fallback;
        throw err;
      }
    }),
  );
});
