// Security headers configuration for Next.js.
// Allows external badges and same-origin PDF embedding.
// Update README (section "CSP External Domains") when editing domains below.

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
  // Permit Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Explicitly allow external stylesheets and inline styles
  "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Allow loading fonts from Google
  "font-src 'self' https://fonts.gstatic.com",
  // External scripts required for embedded timelines
  "script-src 'self' 'unsafe-inline' https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
  // Allow outbound connections for embeds and the in-browser Chrome app
  "connect-src 'self' https://* http://* ws://* wss://* https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://*.google.com https://stackblitz.com",
  // Allow iframes from any website and specific providers so the Chrome and StackBlitz apps can load arbitrary content
  "frame-src 'self' https://* http://* https://stackblitz.com https://*.google.com https://platform.twitter.com https://syndication.twitter.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com https://example.com https://developer.mozilla.org https://en.wikipedia.org",

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

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

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
  if (process.env.NODE_ENV === 'production') {
    config.optimization = {
      ...(config.optimization || {}),
      mangleExports: false,
    };
  }
  return config;
}

module.exports = withBundleAnalyzer({
  ...(isStaticExport ? { output: 'export' } : {}),
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
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1280, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  ...(isStaticExport
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
        async rewrites() {
          return [
            {
              source: '/.well-known/vercel/flags',
              destination: '/api/vercel/flags',
            },
          ];
        },
      }),
});

