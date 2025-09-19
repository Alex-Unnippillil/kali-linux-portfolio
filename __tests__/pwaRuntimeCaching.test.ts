jest.mock('workbox-broadcast-update', () => ({
  BroadcastUpdatePlugin: class BroadcastUpdatePlugin {},
}));
jest.mock('workbox-cacheable-response', () => ({
  CacheableResponsePlugin: class CacheableResponsePlugin {},
}));
jest.mock('workbox-expiration', () => ({
  ExpirationPlugin: class ExpirationPlugin {},
}));

const globalAny: any = globalThis;
if (typeof globalAny.self === 'undefined') {
  globalAny.self = globalAny;
}

const runtimeConfig = require('../lib/pwa/runtimeCaching.js');
const { BroadcastUpdatePlugin } = require('workbox-broadcast-update');

const {
  runtimeCaching,
  API_CACHE_NAME,
  SHELL_CACHE_NAME,
  STATIC_CACHE_NAME,
  API_TIMEOUT_SECONDS,
} = runtimeConfig;

describe('PWA runtime caching configuration', () => {
  it('uses cache-first for static assets', () => {
    const entry = runtimeCaching.find((item: any) => item.options?.cacheName === STATIC_CACHE_NAME);
    expect(entry).toBeDefined();
    expect(entry.handler).toBe('CacheFirst');
  });

  it('uses stale-while-revalidate for navigations', () => {
    const entry = runtimeCaching.find((item: any) => item.options?.cacheName === SHELL_CACHE_NAME);
    expect(entry).toBeDefined();
    expect(entry.handler).toBe('StaleWhileRevalidate');
    expect(
      entry.options?.plugins?.some((plugin: any) => plugin instanceof BroadcastUpdatePlugin),
    ).toBe(true);
  });

  it('uses network-first with timeout for APIs', () => {
    const entry = runtimeCaching.find((item: any) => item.options?.cacheName === API_CACHE_NAME);
    expect(entry).toBeDefined();
    expect(entry.handler).toBe('NetworkFirst');
    expect(entry.options?.networkTimeoutSeconds).toBe(API_TIMEOUT_SECONDS);
    expect(
      entry.options?.plugins?.some((plugin: any) => plugin instanceof BroadcastUpdatePlugin),
    ).toBe(true);
  });
});
