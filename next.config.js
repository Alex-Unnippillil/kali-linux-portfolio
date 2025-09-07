// @ts-check
// Security headers configuration for Next.js.
// Allows external badges and same-origin PDF embedding.
// Update README (section "CSP External Domains") when editing domains below.

let validateEnv;
try {
  ({ validateServerEnv: validateEnv } = require('./lib/validate'));
} catch {
  validateEnv = () => {};
}


const ContentSecurityPolicy = [
  "default-src 'self'",
  // Prevent injection of external base URIs
  "base-uri 'self'",
  // Restrict form submissions to same origin
  "form-action 'self'",
  // Disallow all plugins and other embedded objects
  "object-src 'none'",
  // Allow external images and data URIs for badges/icons
  "img-src 'self' https: data:",
  // Allow inline styles
  "style-src 'self' 'unsafe-inline'",
  // Explicitly allow inline style tags
  "style-src-elem 'self' 'unsafe-inline'",
  // Restrict fonts to same origin
  "font-src 'self'",
  // External scripts required for embedded timelines
  "script-src 'self' 'unsafe-inline' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://sdk.scdn.co",
  // Allow outbound connections for embeds and the in-browser Chrome app
  "connect-src 'self' https://example.com https://developer.mozilla.org https://en.wikipedia.org https://www.google.com https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://*.google.com https://stackblitz.com",
  // Allow iframes from specific providers so the Chrome and StackBlitz apps can load allowed content
  "frame-src 'self' https://vercel.live https://stackblitz.com https://*.google.com https://platform.twitter.com https://syndication.twitter.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com https://react.dev https://example.com https://developer.mozilla.org https://en.wikipedia.org",

  // Allow this site to embed its own resources (resume PDF)
  "frame-ancestors 'self'",
  // Enforce HTTPS for all requests
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
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
    value: 'camera=(), microphone=(), geolocation=*, interest-cohort=()',
  },
  {
    // Allow same-origin framing so the PDF resume renders in an <object>
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
];

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
  analyzerMode: 'json',
});

// Prefix all PWA caches with the current build ID so that each deployment
// uses its own set of caches and outdated entries are naturally discarded.
const buildId =
  process.env.NEXT_BUILD_ID || process.env.BUILD_ID || 'dev';

const precacheManifest = require('./precache-manifest.json');

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  sw: 'service-worker.js',
  disable: process.env.VERCEL_ENV !== 'production',
  buildExcludes: [/dynamic-css-manifest\.json$/],
    fallbacks: {
      'document': '/offline.html',
    },
  workboxOptions: {
    cacheId: buildId,
    navigateFallback: '/offline.html',
    additionalManifestEntries: precacheManifest,

    // Cache only images and fonts to ensure app shell updates while assets work offline
    runtimeCaching: require('./cache.js')(buildId),

  },
});

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  try {
    validateServerEnv(process.env);
  } catch {
    console.warn('Missing env vars; running without validation');
  }
}

// Merge experiment settings and production optimizations into a single function.
function configureWebpack(config, { isServer }) {
  // Enable WebAssembly loading and avoid JSON destructuring bug
  config.experiments ??= {};
  config.experiments.asyncWebAssembly = true;
  // Prevent bundling of server-only modules in the browser
  config.resolve = config.resolve || {};
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    module: false,
    async_hooks: false,
  };
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    'react-dom$': require('path').resolve(__dirname, 'lib/react-dom-shim.js'),
  };
  if (isProd) {
    config.optimization = {
      ...(config.optimization || {}),
      mangleExports: false,
    };
  }
  return config;
}



module.exports = withBundleAnalyzer(
  withPWA({
    ...(isStaticExport && { output: 'export' }),
    webpack: configureWebpack,

    // Temporarily ignore ESLint during builds; use only when a separate lint step runs in CI
    eslint: {
      ignoreDuringBuilds: true,
    },
    images: {
      unoptimized: true,
      domains: [
        'opengraph.githubassets.com',
        'raw.githubusercontent.com',
        'avatars.githubusercontent.com',
        'i.ytimg.com',
        'yt3.ggpht.com',
      ],
      localPatterns: [
        { pathname: '/themes/Yaru/apps/**' },
        { pathname: '/icons/**' },
      ],
      deviceSizes: [640, 750, 828, 1080, 1200, 1280, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },
    i18n: {
      locales: ['en', 'es'],
      defaultLocale: 'en',
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
    ...(isProd
      ? {
          async headers() {
            return [
              {
                source: '/(.*)',
                headers: securityHeaders,
              },
              ...precacheManifest.map(({ url }) => ({
                source: url,
                headers: [
                  {
                    key: 'Cache-Control',
                    value: 'public, max-age=31536000, immutable',
                  },
                ],
              })),
              {
                source: '/manifest.webmanifest',
                headers: [
                  {
                    key: 'Content-Type',
                    value: 'application/manifest+json',
                  },
                  {
                    key: 'Cache-Control',
                    value: 'public, max-age=0, must-revalidate',
                  },
                ],
              },
              {
                source: '/service-worker.js',
                headers: [
                  {
                    key: 'Cache-Control',
                    value: 'public, max-age=0, must-revalidate',
                  },
                ],
              },
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
                    value: 'public, max-age=86400, immutable',
                  },
                ],
              },
            ];
          },
        }
      : {}),
  })
);

