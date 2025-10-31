// Security headers configuration for Next.js.
// Allows external badges and same-origin PDF embedding.
// Update README (section "CSP External Domains") when editing the shared CSP sources.

const { validateServerEnv: validateEnv } = require('./lib/validate.js');
const { buildCsp } = require('./lib/csp/sources.js');

const ContentSecurityPolicy = buildCsp();

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

function sanitizeBuildId(rawId) {
  if (!rawId) return undefined;
  const trimmed = rawId.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '-');
}

const rawBuildId =
  process.env.NEXT_PUBLIC_BUILD_ID ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA;

const resolvedBuildId = sanitizeBuildId(rawBuildId);

if (resolvedBuildId) {
  process.env.NEXT_PUBLIC_BUILD_ID = resolvedBuildId;
}

// Prefix Workbox-managed caches with the build identifier so new deployments
// invalidate old cache groups automatically.
const workboxCacheId = resolvedBuildId ? `kali-portfolio-${resolvedBuildId}` : undefined;

const {
  default: withPWAInit,
  runtimeCaching: defaultRuntimeCaching,
} = require('@ducanh2912/next-pwa');

function buildAwareCacheName(name) {
  if (!name) return name;
  return resolvedBuildId ? `${name}-${resolvedBuildId}` : name;
}

const normalizedBasePath = (() => {
  const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? '';
  if (!rawBasePath) return '/';
  const prefixed = rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`;
  return prefixed.endsWith('/') && prefixed !== '/' ? prefixed.slice(0, -1) : prefixed;
})();

const startUrlRuntimeCaching = {
  urlPattern: ({ sameOrigin, url }) => {
    if (!sameOrigin) return false;
    const path = url.pathname.endsWith('/') && url.pathname !== '/' ? url.pathname.slice(0, -1) : url.pathname || '/';
    return path === normalizedBasePath;
  },
  handler: 'NetworkFirst',
  options: {
    cacheName: buildAwareCacheName('start-url'),
    plugins: [
      {
        cacheWillUpdate: async ({ response }) =>
          response && response.type === 'opaqueredirect'
            ? new Response(response.body, {
                status: 200,
                statusText: 'OK',
                headers: response.headers,
              })
            : response,
      },
    ],
  },
};

const runtimeCaching = [
  startUrlRuntimeCaching,
  ...defaultRuntimeCaching.map((entry) => ({
    ...entry,
    ...(entry.options
      ? {
          options: {
            ...entry.options,
            ...(entry.options.cacheName
              ? { cacheName: buildAwareCacheName(entry.options.cacheName) }
              : {}),
          },
        }
      : {}),
  })),
];

const withPWA = withPWAInit({
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
    runtimeCaching,
    ...(workboxCacheId && { cacheId: workboxCacheId }),
  },
  dynamicStartUrl: false,
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
        'i.ytimg.com',
        'yt3.ggpht.com',
        'ghchart.rshah.org',
        'img.shields.io',
        'images.credly.com',
        'icons.duckduckgo.com',
        'staticmap.openstreetmap.de',
        'data.typeracer.com',
      ],
      deviceSizes: [640, 750, 828, 1080, 1200, 1280, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },
    // Security headers are skipped outside production; remove !isProd check to restore them for development.
    ...(isStaticExport || !isProd
      ? {}
      : {
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
        }),
  })
);

