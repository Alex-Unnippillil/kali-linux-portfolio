import { jest } from '@jest/globals';

const registerRoute = jest.fn();
const setCatchHandler = jest.fn();

const strategyMock = (type: string) =>
  jest.fn().mockImplementation(function (options) {
    this.type = type;
    this.options = options;
  });

const CacheFirst = strategyMock('CacheFirst');
const StaleWhileRevalidate = strategyMock('StaleWhileRevalidate');
const NetworkFirst = strategyMock('NetworkFirst');

jest.mock('workbox-routing', () => ({ registerRoute, setCatchHandler }));
jest.mock('workbox-precaching', () => ({ precacheAndRoute: jest.fn(), cleanupOutdatedCaches: jest.fn() }));
jest.mock('workbox-strategies', () => ({ CacheFirst, StaleWhileRevalidate, NetworkFirst }));
jest.mock('workbox-expiration', () => ({ ExpirationPlugin: jest.fn() }));
jest.mock('workbox-core', () => ({ setCacheNameDetails: jest.fn() }));

// Minimal service worker globals
const listeners: Record<string, (event: any) => void> = {};
(global as any).self = {
  addEventListener: jest.fn((event: string, cb: (e: any) => void) => {
    listeners[event] = cb;
  }),
  clients: { claim: jest.fn() },
  skipWaiting: jest.fn(),
  __WB_MANIFEST: [],
};
(global as any).caches = { match: jest.fn() };

describe('service worker routes', () => {
  it('registers strategies for images, JSON feeds, and docs', async () => {
    await import('../sw');

    const calls = registerRoute.mock.calls;

    const imageCall = calls.find(([matcher]) =>
      matcher({ request: { destination: 'image' }, url: new URL('https://example.com/photo.png') }),
    );
    expect(imageCall?.[1].type).toBe('CacheFirst');

    const jsonCall = calls.find(([matcher]) =>
      matcher({ request: {}, url: new URL('https://example.com/data/feed.json') }),
    );
    expect(jsonCall?.[1].type).toBe('StaleWhileRevalidate');

    const docsCall = calls.find(([matcher]) =>
      matcher({ request: { destination: 'document' }, url: new URL('https://example.com/docs/setup') }),
    );
    expect(docsCall?.[1].type).toBe('NetworkFirst');
  });
});

