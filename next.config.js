// @ts-check
// Security headers configuration for Next.js.
// Allows external badges and same-origin PDF embedding.
// Update README (section "CSP External Domains") when editing domains below.

require('tsx/cjs');
const { validateServerEnv: validateEnv } = require('./lib/validate.ts');

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
    value: 'camera=(), microphone=(), geolocation=*',
  },
  {
    // Allow same-origin framing so the PDF resume renders in an <object>
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
];

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  sw: 'sw.js',
  disable: process.env.VERCEL_ENV !== 'production',
  buildExcludes: [/dynamic-css-manifest\.json$/],
  workboxOptions: {
    navigateFallback: '/offline.html',
    additionalManifestEntries: [
      { url: '/', revision: null },
      { url: '/feeds', revision: null },
      { url: '/about', revision: null },
      { url: '/projects', revision: null },
      { url: '/projects.json', revision: null },
      { url: '/apps', revision: null },
      { url: '/apps/weather', revision: null },
      { url: '/apps/terminal', revision: null },
      { url: '/apps/checkers', revision: null },
      { url: '/offline.html', revision: null },
      { url: '/manifest.webmanifest', revision: null },
      { url: '/favicon.ico', revision: null },
      { url: '/favicon.svg', revision: null },
      { url: '/images/logos/fevicon.png', revision: null },
      { url: '/images/logos/logo_1024.png', revision: null },
    ],
    // Cache only images and fonts to ensure app shell updates while assets work offline
    runtimeCaching: require('./cache.js'),
  },
});

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
const isProd = process.env.NODE_ENV === 'production';

// Merge experiment settings and production optimizations into a single function.
function configureWebpack(config, { isServer }) {
  // Enable WebAssembly loading and avoid JSON destructuring bug
  config.experiments = {
    ...(config.experiments || {}),
    asyncWebAssembly: true,
  };
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

try {
  validateEnv?.(process.env);
} catch {
  console.warn('Missing env vars; running without validation');
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
        'i.scdn.co',
        'www.google.com',
        'example.com',
        'developer.mozilla.org',
        'en.wikipedia.org',
        'ghchart.rshah.org',
        'openweathermap.org',
        'staticmap.openstreetmap.de',
        'data.typeracer.com',
        'img.shields.io',
        'images.credly.com',
      ],
      localPatterns: [
        { pathname: '/themes/Yaru/apps/**' },
        { pathname: '/icons/**' },
      ],
      deviceSizes: [640, 750, 828, 1080, 1200, 1280, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256],
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
                source: '/sw.js',
                headers: [
                  {
                    key: 'Cache-Control',
                    value: 'public, max-age=0, must-revalidate',
                  },
                ],
              },
              {
                source: '/fonts/(.*)',
                headers: [
                  {
                    key: 'Cache-Control',
                    value: 'public, max-age=31536000, immutable',
                  },
                ],
              },
              {
                source: '/images/(.*)',
                headers: [
                  {
                    key: 'Cache-Control',
                    value: 'public, max-age=86400',
                  },
                ],
              },
            ];
          },
        }
      : {}),
  })
);

