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
  "style-src 'self' https://fonts.googleapis.com",
  // Explicitly allow external stylesheets
  "style-src-elem 'self' https://fonts.googleapis.com",
  // Allow loading fonts from Google
  "font-src 'self' https://fonts.gstatic.com",
  // External scripts required for embedded timelines and Google APIs
  "script-src 'self' 'nonce-__CSP_NONCE__' https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com",
  // Allow outbound connections for embeds and APIs
  "connect-src 'self' https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.google.com https://www.gstatic.com https://www.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://stackblitz.com",
  // Restrict iframes to trusted providers
  "frame-src 'self' https://stackblitz.com https://www.google.com https://platform.twitter.com https://syndication.twitter.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com",
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

