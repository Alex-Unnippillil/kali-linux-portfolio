// Security headers configuration for Next.js.
// Allows external badges and same-origin PDF embedding.
// Update README (section "CSP External Domains") when editing domains in ./lib/csp.js.

const { validateServerEnv: validateEnv } = require('./lib/validate.js');
const { createContentSecurityPolicy } = require('./lib/csp');

const ContentSecurityPolicy = createContentSecurityPolicy();

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
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
    value: 'camera=(), microphone=(), geolocation=()',
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
  disable: process.env.NODE_ENV === 'development',
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
    ],
  },
});

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
const isProd = process.env.NODE_ENV === 'production';
const enableSecurityHeaders =
  process.env.NEXT_SECURITY_HEADERS !== 'off' && !isStaticExport;

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
      ],
      deviceSizes: [640, 750, 828, 1080, 1200, 1280, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },
    ...(enableSecurityHeaders
      ? {
          async headers() {
            return [
              {
                source: '/(.*)',
                headers: securityHeaders,
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

