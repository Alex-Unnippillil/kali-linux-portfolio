import path from 'path';

import bundleAnalyzer from '@next/bundle-analyzer';
import nextPwa from '@ducanh2912/next-pwa';
import type { NextConfig } from 'next';

import { serverEnv, validateServerEnv } from './lib/env.server';

const ContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline'",
  "style-src-elem 'self' 'unsafe-inline'",
  "font-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
  "connect-src 'self' https://example.com https://developer.mozilla.org https://en.wikipedia.org https://www.google.com https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://*.google.com https://stackblitz.com",
  "frame-src 'self' https://vercel.live https://stackblitz.com https://*.google.com https://platform.twitter.com https://syndication.twitter.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com https://example.com https://developer.mozilla.org https://en.wikipedia.org",
  "frame-ancestors 'self'",
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
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: serverEnv.ANALYZE === 'true',
});

const withPWA = nextPwa({
  dest: 'public',
  sw: 'sw.js',
  disable: serverEnv.NODE_ENV === 'development',
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
  // @ts-expect-error buildExcludes is supported by next-pwa but not typed in the package
  buildExcludes: [/dynamic-css-manifest\.json$/],
});

const isStaticExport = serverEnv.NEXT_PUBLIC_STATIC_EXPORT === 'true';
const isProd = serverEnv.NODE_ENV === 'production';

function configureWebpack(
  config: any,
  { isServer: _isServer }: { isServer: boolean },
) {
  config.experiments = {
    ...(config.experiments || {}),
    asyncWebAssembly: true,
  };
  config.resolve = config.resolve || {};
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    module: false,
    async_hooks: false,
  };
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    'react-dom$': path.resolve(__dirname, 'lib/react-dom-shim.js'),
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
  validateServerEnv(process.env);
} catch {
  console.warn('Missing env vars; running without validation');
}

const config: NextConfig = withBundleAnalyzer(
  withPWA({
    ...(isStaticExport && { output: 'export' }),
    webpack: configureWebpack,
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
  }),
);

export default config;
