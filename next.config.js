// Security headers configuration for Next.js.
// Allows external badges and same-origin PDF embedding without inline styles.

const { validateEnv } = require('./lib/validate.js');
const crypto = require('crypto');

function getContentSecurityPolicy(nonce) {
  return [
    "default-src 'self'",
    // Allow external images and data URIs for badges/icons
    "img-src 'self' https: data:",
    // Allow styles from self and Google Fonts
    "style-src 'self' https://fonts.googleapis.com",
    // Allow external font resources
    "font-src 'self' https://fonts.gstatic.com",
    // External script required for embedded timelines
    `script-src 'self' 'nonce-${nonce}' https://platform.twitter.com`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    // Allow outbound connections for embeds and the in-browser Chrome app
    "connect-src 'self' https://cdn.syndication.twimg.com https://*.twitter.com https://stackblitz.com https://api.axiom.co",
    // Allow iframes from specific providers so the Chrome and StackBlitz apps can load arbitrary content
    "frame-src 'self' https://stackblitz.com https://ghbtns.com https://platform.twitter.com https://open.spotify.com https://todoist.com https://www.youtube.com https://www.youtube-nocookie.com",
    // Allow this site to embed its own resources (resume PDF)
    "frame-ancestors 'self'",
    // Disallow plugins and limit base/submit targets
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Enable Reporting API endpoint for violations
    'report-to csp-endpoint',
  ].join('; ');
}

async function getSecurityHeaders() {
  const nonce = crypto.randomBytes(16).toString('base64');
  const ContentSecurityPolicy = getContentSecurityPolicy(nonce);
  return [
    { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
    {
      key: 'Report-To',
      value:
        '{"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"/api/csp-reporter"}]}',
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
      value:
        'camera=(), microphone=(), geolocation=(), usb=(), payment=(), serial=()',
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'off',
    },
    {
      key: 'X-Permitted-Cross-Domain-Policies',
      value: 'none',
    },
    {
      key: 'Cross-Origin-Opener-Policy',
      value: 'same-origin',
    },
    {
      key: 'Cross-Origin-Resource-Policy',
      value: 'same-site',
    },
    {
      // Allow same-origin framing so the PDF resume renders in an <object>
      key: 'X-Frame-Options',
      value: 'SAMEORIGIN',
    },
  ];
}

module.exports = {
  bundlePagesRouterDependencies: true,
  productionBrowserSourceMaps: true,
  images: {
    // Keep unoptimized if you serve static assets without the Next image optimizer.
    unoptimized: true,
    domains: [
      'opengraph.githubassets.com',
      'raw.githubusercontent.com',
      'avatars.githubusercontent.com',
    ],
  },
  experimental: {
    optimizePackageImports: ['chart.js', 'react-chartjs-2'],

  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false,
      worker_threads: false,
      perf_hooks: false,
      readline: false,
    };
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      mermaid: require('path').resolve(__dirname, 'lib/mermaidStub.js'),
      'argon2-browser': require('path').resolve(__dirname, 'lib/argon2Stub.js'),
      'vis-timeline/dist/vis-timeline-graph2d.min.css': require('path').resolve(
        __dirname,
        'node_modules/vis-timeline/styles/vis-timeline-graph2d.min.css'
      ),
    };
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
    };
    return config;
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') {
      return [];
    }
    validateEnv(process.env);
    const securityHeaders = await getSecurityHeaders();
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

