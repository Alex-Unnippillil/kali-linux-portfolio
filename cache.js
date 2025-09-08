'use strict'

/**
 * Generate Workbox runtime caching configuration with cache names prefixed
 * by the current build ID. Prefixing ensures that stale caches from previous
 * deployments are ignored and can be cleaned up by the browser.
 *
 * @param {string} buildId - Build identifier used as cache name prefix.
 * @returns {import('workbox-build').RuntimeCaching[]}
 */
module.exports = function(buildId = 'dev') {
  const withPrefix = (name) => `${buildId}-${name}`;

  return [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: withPrefix('google-fonts-webfonts'),
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 365 days
        }
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: withPrefix('google-fonts-stylesheets'),
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        }
      }
    },
    // Cache locally hosted font files with a cache-first strategy so they work offline
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: withPrefix('static-font-assets'),
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 365 days
        }
      }
    },
    {
      urlPattern: /\/(?:favicon\.ico|favicon\.svg|images\/logos\/.*\.(?:png|svg))$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: withPrefix('static-icon-assets'),
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    // Runtime cache for images from any origin, keeping the most recent copy fresh
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: withPrefix('static-image-assets'),
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: withPrefix('next-image'),
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    }
  ];
};
