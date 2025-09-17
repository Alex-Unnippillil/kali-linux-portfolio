const baseContentSecurityPolicy = [
  ['default-src', ["'self'"]],
  // Prevent injection of external base URIs
  ['base-uri', ["'self'"]],
  // Restrict form submissions to same origin
  ['form-action', ["'self'"]],
  // Disallow all plugins and other embedded objects
  ['object-src', ["'none'"]],
  // Allow external images and data URIs for badges/icons
  ['img-src', ["'self'", 'https:', 'data:']],
  // Allow inline styles and web fonts
  ['style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']],
  ['style-src-elem', ["'self'", "'unsafe-inline'"]],
  ['font-src', ["'self'", 'https://fonts.gstatic.com']],
  // External scripts required for embedded timelines
  [
    'script-src',
    [
      "'self'",
      "'unsafe-inline'",
      'https://vercel.live',
      'https://platform.twitter.com',
      'https://syndication.twitter.com',
      'https://cdn.syndication.twimg.com',
      'https://*.twitter.com',
      'https://*.x.com',
      'https://www.youtube.com',
      'https://www.google.com',
      'https://www.gstatic.com',
      'https://cdn.jsdelivr.net',
      'https://cdnjs.cloudflare.com',
    ],
  ],
  // Allow outbound connections for embeds and the in-browser Chrome app
  [
    'connect-src',
    [
      "'self'",
      'https://example.com',
      'https://developer.mozilla.org',
      'https://en.wikipedia.org',
      'https://www.google.com',
      'https://platform.twitter.com',
      'https://syndication.twitter.com',
      'https://cdn.syndication.twimg.com',
      'https://*.twitter.com',
      'https://*.x.com',
      'https://*.google.com',
      'https://stackblitz.com',
    ],
  ],
  // Allow iframes from specific providers so the Chrome and StackBlitz apps can load allowed content
  [
    'frame-src',
    [
      "'self'",
      'https://vercel.live',
      'https://stackblitz.com',
      'https://*.google.com',
      'https://platform.twitter.com',
      'https://syndication.twitter.com',
      'https://cdn.syndication.twimg.com',
      'https://*.twitter.com',
      'https://*.x.com',
      'https://www.youtube.com',
      'https://www.youtube-nocookie.com',
      'https://open.spotify.com',
      'https://example.com',
      'https://developer.mozilla.org',
      'https://en.wikipedia.org',
      'https://ghbtns.com',
      'https://todoist.com',
    ],
  ],

  // Allow this site to embed its own resources (resume PDF)
  ['frame-ancestors', ["'self'"]],
  // Enforce HTTPS for all requests
  ['upgrade-insecure-requests', []],
];

function normalizeValues(rawValues) {
  if (!rawValues) return [];
  if (Array.isArray(rawValues)) return [...rawValues];
  if (typeof rawValues === 'string' && rawValues.length) return [rawValues];
  return [];
}

function createCsp(overrides = {}) {
  const directives = new Map(
    baseContentSecurityPolicy.map(([directive, values]) => [directive, [...values]])
  );

  Object.entries(overrides).forEach(([directive, rawValues]) => {
    directives.set(directive, normalizeValues(rawValues));
  });

  return Array.from(directives.entries())
    .map(([directive, values]) =>
      values.length ? `${directive} ${values.join(' ')}` : directive
    )
    .join('; ');
}

function getBaseDirectiveValues(directive) {
  const entry = baseContentSecurityPolicy.find(([name]) => name === directive);
  return entry ? [...entry[1]] : [];
}

function createSecurityHeaders(overrides = {}) {
  return [
    {
      key: 'Content-Security-Policy',
      value: createCsp(overrides),
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
}

const defaultSecurityHeaders = createSecurityHeaders();
const sensitivePageSecurityHeaders = createSecurityHeaders({
  'connect-src': ["'self'"],
  'frame-src': ["'none'"],
});

module.exports = {
  baseContentSecurityPolicy,
  createCsp,
  createSecurityHeaders,
  defaultSecurityHeaders,
  sensitivePageSecurityHeaders,
  getBaseDirectiveValues,
};
