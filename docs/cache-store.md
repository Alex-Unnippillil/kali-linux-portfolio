# Cache Store Guide

The client runtime now exposes a shared cache helper that stores heavy blobs and JSON payloads in the Origin Private File System (OPFS) when the browser supports it. When OPFS is unavailable the cache automatically falls back to IndexedDB while preserving the same API.

## API overview

```ts
import cacheStore from '../utils/cacheStore';

// JSON
const { data } = await cacheStore.rememberJSON('fixtures:suricata', async () => {
  const res = await fetch('/fixtures/suricata.json', { cache: 'no-store' });
  return res.json();
}, { ttlMs: 12 * 60 * 60 * 1000 });

// Text
const { data: text } = await cacheStore.rememberText('fixtures:yara', async () => {
  const res = await fetch('/fixtures/yara_sample.txt');
  return res.text();
});

// Blob
const { data: blob } = await cacheStore.rememberBlob('artifacts:pcap', async () => {
  const res = await fetch('/demo/pcap.bin');
  return res.blob();
});
```

Each `remember*` helper:

- Computes a SHA-256 content hash for the payload and uses it as the storage key.
- Stores the value in OPFS (`navigator.storage.getDirectory`) when available, falling back to IndexedDB otherwise.
- Supports `ttlMs` to control time-to-live per entry (defaults to seven days) and `signal` for cancellation.
- Returns the cached data along with metadata (`hash`, `status`, `meta`) so callers can inspect cache behaviour if needed.

## Capacity, TTL, and eviction

- The cache is capped at 50&nbsp;MB by default. When writes would exceed the cap it evicts the least-recently-used entry (preferring expired entries when possible).
- Expired entries are cleaned up when accessed, and corrupt entries (missing data or invalid JSON) are purged automatically.
- Cache statistics (hits, misses, hit ratio, evictions, corruptions, and current size) are exposed via `cacheStore.getStats()` and surfaced in the Resource Monitor developer panel.
- Eviction events are logged to the console with the hash, size, and reason (`capacity`, `ttl`, `manual`, `corruption`).

## Integration guidance

- Prefer a stable alias for the first parameter (e.g. `fixtures:suricata`). The alias maps to the content hash internally, so reusing the alias keeps cache metrics meaningful.
- Always pass the same `AbortSignal` to both `remember*` and the underlying `fetch` so cancellation propagates correctly.
- Large fixture loaders (`components/FixturesLoader`, `SecurityTools`) already use the cache. Follow those patterns when adding new heavy loaders.
- Call `cacheStore.clear()` if you need to wipe local cache data (e.g. when resetting lab data).

## Testing

Integration tests live in `__tests__/cacheStore.integration.test.ts` and simulate cache hits, eviction, and corruption recovery using `fake-indexeddb`. Use `resetCacheStoreForTesting` to seed deterministic options in new tests.
