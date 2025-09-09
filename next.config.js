/**
 * @type {import('next').NextConfig}
 */

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), interest-cohort=()',

  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
  analyzerMode: 'json',
});

// Prefix PWA caches with the current build ID so each deployment gets its own
// cache namespace. The service worker reads this via NEXT_PUBLIC_BUILD_ID and
// calls setCacheNameDetails to apply the prefix.
const buildId =
  process.env.NEXT_BUILD_ID || process.env.BUILD_ID || 'dev';

let precacheManifest = [];
try {
  precacheManifest = require('./precache-manifest.json');
} catch {
  // The manifest is generated at build time; fall back to an empty list when absent
}

const additionalManifestEntries = [
  // Precache the main shell and tools index so they are instantly available offline
  { url: '/', revision: buildId },
  { url: '/apps', revision: buildId },
];
precacheManifest.forEach((entry) => additionalManifestEntries.push(entry));

const withPWAInit = require('@ducanh2912/next-pwa').default;
// Enable PWA support via next-pwa
const withPWA = withPWAInit({
  dest: 'public',
  sw: 'service-worker.js',
  // Enable the service worker for all production builds, even when not on Vercel.
  // This avoids the "PWA support is disabled" message in local builds.
  disable: process.env.NODE_ENV !== 'production',
  buildExcludes: [/dynamic-css-manifest\.json$/],
  fallbacks: {
    document: '/offline.html',
  },
  workboxOptions: {
    swSrc: 'sw.ts',
    additionalManifestEntries,
  },
});


let withExportImages = (config) => config;
try {
  withExportImages = require('next-export-optimize-images');
} catch {}

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
const isProd = process.env.NODE_ENV === 'production';

if (isProd && typeof validateEnv === 'function') {
  validateEnv(process.env);
}

// Merge experiment settings and production optimizations into a single function.
function configureWebpack(config, { isServer }) {
  // Enable WebAssembly loading and avoid JSON destructuring bug
  config.experiments ??= {};
  config.experiments.asyncWebAssembly = true;
  // Prevent bundling of server-only modules in the browser
  config.resolve = config.resolve || {};
  config.resolve.fallback = Object.assign(
    {},
    config.resolve.fallback,
    {
      module: false,
      async_hooks: false,
      fs: false,
      worker_threads: false,
      readline: false,
    }
  );
  config.resolve.alias = Object.assign(
    {},
    config.resolve.alias,
    {
      'react-dom$': require('path').resolve(
        __dirname,
        'lib/react-dom-shim.js'
      ),
    }
  );
  if (isProd) {
    config.optimization = Object.assign({}, config.optimization, {
      mangleExports: false,
    });
  }
  return config;
}



module.exports = withBundleAnalyzer(
  withExportImages({
    output: isStaticExport ? 'export' : undefined,
    serverExternalPackages: [
      '@supabase/supabase-js',
      '@tinyhttp/cookie-signature',
    ],
    webpack: configureWebpack,

    // Run ESLint during builds so linting problems surface in CI and local builds.
    eslint: {
      ignoreDuringBuilds: false,
    },
    typescript: {
      ignoreBuildErrors: false,
    },
    experimental: {
      optimizeCss: true,
    },
    images: {
      unoptimized: true,
      domains: [
        'opengraph.githubassets.com',
        'raw.githubusercontent.com',
        'avatars.githubusercontent.com',
        'i.ytimg.com',
        'yt3.ggpht.com',
        'openweathermap.org',
        'ghchart.rshah.org',
        'data.typeracer.com',
        'images.credly.com',
        'staticmap.openstreetmap.de',
      ],
      remotePatterns: [
        { protocol: 'https', hostname: 'opengraph.githubassets.com' },
        { protocol: 'https', hostname: 'raw.githubusercontent.com' },
        { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
        { protocol: 'https', hostname: 'i.ytimg.com' },
        { protocol: 'https', hostname: 'yt3.ggpht.com' },
        { protocol: 'https', hostname: 'openweathermap.org' },
        { protocol: 'https', hostname: 'ghchart.rshah.org' },
        { protocol: 'https', hostname: 'data.typeracer.com' },
        { protocol: 'https', hostname: 'images.credly.com' },
        { protocol: 'https', hostname: 'staticmap.openstreetmap.de' },
      ],
      localPatterns: [
        { pathname: '/themes/Yaru/apps/**' },
        { pathname: '/icons/**' },
      ],
      deviceSizes: [640, 750, 828, 1080, 1200, 1280, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256],
      formats: ['image/avif', 'image/webp'],
    },
    async rewrites() {
      return [
        {
          source: '/.well-known/vercel/flags',
          destination: '/api/vercel/flags',
        },
      ];
    },
    // Apply security headers only in production.
    headers: isProd
      ? async () => {
          const result = [
            {
              source: '/',
              headers: [
                {
                  key: 'Link',
                  value: '</wallpapers/wall-1.webp>; rel=preload; as=image',
                },
              ],
            },
            {
              source: '/:path*',
              headers: [
                {
                  key: 'Link',
                  value: '<https://fonts.googleapis.com>; rel=preconnect; crossorigin',
                },
                {
                  key: 'Link',
                  value: '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
                },
              ],
            },
            {
              source: '/_next/static/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
            {
              source: '/(.*)',
              headers: securityHeaders,
            },
          ];
          result.push(
            {
              source: '/fonts/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
            {
              source: '/images/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            }
          );
          return result;
        }
      : undefined,
  })
);


module.exports = nextConfig;
