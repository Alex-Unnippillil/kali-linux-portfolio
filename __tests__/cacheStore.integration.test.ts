import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import cacheStore, {
  CACHE_DB_NAME,
  CACHE_DB_VERSION,
  CACHE_DATA_STORE,
  resetCacheStoreForTesting,
} from '../utils/cacheStore';

describe('cacheStore integration', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    await resetCacheStoreForTesting({ maxBytes: 2000, defaultTtlMs: 60_000 });
  });

  afterEach(async () => {
    await resetCacheStoreForTesting({ maxBytes: 2000, defaultTtlMs: 60_000 });
    jest.useRealTimers();
  });

  it('reuses cached JSON within TTL and updates hit metrics', async () => {
    const loader = jest.fn(async () => ({ value: 'alpha' }));

    const first = await cacheStore.rememberJSON('test:json', loader, { ttlMs: 60_000 });
    expect(first.status).toBe('miss');
    expect(first.data).toEqual({ value: 'alpha' });
    expect(loader).toHaveBeenCalledTimes(1);

    const second = await cacheStore.rememberJSON('test:json', loader);
    expect(second.status).toBe('hit');
    expect(second.data).toEqual({ value: 'alpha' });
    expect(loader).toHaveBeenCalledTimes(1);

    let stats = cacheStore.getStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(1);

    jest.advanceTimersByTime(61_000);

    const third = await cacheStore.rememberJSON('test:json', loader, { ttlMs: 60_000 });
    expect(third.status).toBe('miss');
    expect(loader).toHaveBeenCalledTimes(2);

    stats = cacheStore.getStats();
    expect(stats.misses).toBe(2);
    expect(stats.hits).toBe(1);
  });

  it('evicts least recently used entries when the cache exceeds capacity', async () => {
    await resetCacheStoreForTesting({ maxBytes: 200, defaultTtlMs: 60_000 });

    const loaderA = jest.fn(async () => 'a'.repeat(80));
    const loaderB = jest.fn(async () => 'b'.repeat(80));
    const loaderC = jest.fn(async () => 'c'.repeat(80));

    const a = await cacheStore.rememberText('fixtures:a', loaderA);
    expect(a.status).toBe('miss');
    const b = await cacheStore.rememberText('fixtures:b', loaderB);
    expect(b.status).toBe('miss');

    let stats = cacheStore.getStats();
    expect(stats.evictions).toBe(0);

    const c = await cacheStore.rememberText('fixtures:c', loaderC);
    expect(c.status).toBe('miss');

    stats = cacheStore.getStats();
    expect(stats.evictions).toBeGreaterThanOrEqual(1);

    const replayB = await cacheStore.rememberText('fixtures:b', loaderB);
    expect(replayB.status).toBe('hit');
    expect(loaderB).toHaveBeenCalledTimes(1);

    const replayA = await cacheStore.rememberText('fixtures:a', loaderA);
    expect(replayA.status).toBe('miss');
    expect(loaderA).toHaveBeenCalledTimes(2);
  });

  it('recovers from missing cached data by refetching', async () => {
    const loader = jest.fn(async () => ({ payload: 'data' }));
    const first = await cacheStore.rememberJSON('fixtures:corrupt', loader);
    expect(first.status).toBe('miss');

    const hash = first.hash;
    const db = await openDB(CACHE_DB_NAME, CACHE_DB_VERSION);
    await db.delete(CACHE_DATA_STORE, hash);

    const second = await cacheStore.rememberJSON('fixtures:corrupt', loader);
    expect(second.status).toBe('miss');
    expect(loader).toHaveBeenCalledTimes(2);

    const stats = cacheStore.getStats();
    expect(stats.corruptions).toBeGreaterThanOrEqual(1);
  });
});
