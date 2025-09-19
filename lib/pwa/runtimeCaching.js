if (typeof globalThis !== 'undefined') {
  if (typeof globalThis.self === 'undefined') {
    globalThis.self = globalThis;
  }
  if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = {};
  }
}

const { BroadcastUpdatePlugin } = require('workbox-broadcast-update');
const { CacheableResponsePlugin } = require('workbox-cacheable-response');
const { ExpirationPlugin } = require('workbox-expiration');

const STATIC_CACHE_NAME = 'static-assets-v1';
const SHELL_CACHE_NAME = 'shell-runtime-v1';
const API_CACHE_NAME = 'api-runtime-v1';
const STATIC_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const STATIC_MAX_ENTRIES = 128;
const SHELL_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const API_TIMEOUT_SECONDS = 5;
const API_MAX_ENTRIES = 50;
const API_MAX_AGE_SECONDS = 24 * 60 * 60;
const API_BROADCAST_CHANNEL = 'api-updates';
const SHELL_BROADCAST_CHANNEL = 'shell-updates';

const runtimeCaching = [
  {
    urlPattern: ({ request, sameOrigin, url }) => {
      if (!request || !sameOrigin) return false;
      if (['style', 'script', 'worker', 'font'].includes(request.destination)) {
        return true;
      }
      return /\.(?:js|css|woff2?|ttf)$/.test(url.pathname);
    },
    handler: 'CacheFirst',
    options: {
      cacheName: STATIC_CACHE_NAME,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: STATIC_MAX_ENTRIES,
          maxAgeSeconds: STATIC_MAX_AGE_SECONDS,
          purgeOnQuotaError: true,
        }),
      ],
    },
  },
  {
    urlPattern: ({ request }) => request?.mode === 'navigate',
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: SHELL_CACHE_NAME,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: SHELL_MAX_AGE_SECONDS,
          purgeOnQuotaError: true,
        }),
        new BroadcastUpdatePlugin({ channelName: SHELL_BROADCAST_CHANNEL }),
      ],
    },
  },
  {
    urlPattern: ({ sameOrigin, url, request }) =>
      Boolean(sameOrigin && request && request.method === 'GET' && url.pathname.startsWith('/api/')),
    handler: 'NetworkFirst',
    options: {
      cacheName: API_CACHE_NAME,
      networkTimeoutSeconds: API_TIMEOUT_SECONDS,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: API_MAX_ENTRIES,
          maxAgeSeconds: API_MAX_AGE_SECONDS,
          purgeOnQuotaError: true,
        }),
        new BroadcastUpdatePlugin({ channelName: API_BROADCAST_CHANNEL }),
      ],
    },
  },
];

module.exports = {
  runtimeCaching,
  STATIC_CACHE_NAME,
  SHELL_CACHE_NAME,
  API_CACHE_NAME,
  API_TIMEOUT_SECONDS,
  API_BROADCAST_CHANNEL,
  SHELL_BROADCAST_CHANNEL,
};
