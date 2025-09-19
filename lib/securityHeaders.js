// Central security header definitions used by Next.js configuration and tests.
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
  // Allow inline styles
  "style-src 'self' 'unsafe-inline'",
  // Explicitly allow inline style tags
  "style-src-elem 'self' 'unsafe-inline'",
  // Restrict fonts to same origin
  "font-src 'self'",
  // External scripts required for embedded timelines
  "script-src 'self' 'unsafe-inline' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
  // Allow outbound connections for embeds and the in-browser Chrome app
  "connect-src 'self' https://example.com https://developer.mozilla.org https://en.wikipedia.org https://www.google.com https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://*.google.com https://stackblitz.com",
  // Allow iframes from specific providers so the Chrome and StackBlitz apps can load allowed content
  "frame-src 'self' https://vercel.live https://stackblitz.com https://*.google.com https://platform.twitter.com https://syndication.twitter.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com https://example.com https://developer.mozilla.org https://en.wikipedia.org",

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
    value: 'camera=(), microphone=(), geolocation=*',
  },
  {
    // Allow same-origin framing so the PDF resume renders in an <object>
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
];

module.exports = {
  ContentSecurityPolicy,
  securityHeaders,
};
