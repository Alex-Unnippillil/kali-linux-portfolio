// Security headers configuration for Next.js.
// Allows external badges and same-origin PDF embedding.

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
  "style-src 'self' https://fonts.googleapis.com",
  // Explicitly allow external stylesheets
  "style-src-elem 'self' https://fonts.googleapis.com",
  // Allow loading fonts from Google
  "font-src 'self' https://fonts.gstatic.com",
  // External scripts required for embedded timelines
  "script-src 'self' 'unsafe-inline' https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com",
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

module.exports = {
  images: {
    domains: [
      'opengraph.githubassets.com',
      'raw.githubusercontent.com',
      'avatars.githubusercontent.com',
      'i.ytimg.com',
      'yt3.ggpht.com',
      'i.scdn.co',
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

