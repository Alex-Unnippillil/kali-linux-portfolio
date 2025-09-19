const CSP_NONCE_PLACEHOLDER = '__CSP_NONCE__';

/**
 * Shared Content-Security-Policy directives.
 * The nonce placeholder is replaced at runtime inside middleware.
 */
const cspDirectives = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
  "img-src": ["'self'", 'https:', 'data:'],
  "style-src": ["'self'", "'unsafe-inline'"],
  "style-src-elem": ["'self'", "'unsafe-inline'"],
  "font-src": ["'self'", 'https://fonts.gstatic.com'],
  "script-src": [
    "'self'",
    "'nonce-__CSP_NONCE__'",
    'https://vercel.live',
    'https://va.vercel-scripts.com',
    'https://platform.twitter.com',
    'https://syndication.twitter.com',
    'https://cdn.syndication.twimg.com',
    'https://*.twitter.com',
    'https://*.x.com',
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
    'https://www.google.com',
    'https://www.gstatic.com',
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com',
    'https://www.googletagmanager.com',
  ],
  "connect-src": [
    "'self'",
    'https://example.com',
    'https://developer.mozilla.org',
    'https://en.wikipedia.org',
    'https://www.google.com',
    'https://www.youtube.com',
    'https://www.googleapis.com',
    'https://platform.twitter.com',
    'https://syndication.twitter.com',
    'https://cdn.syndication.twimg.com',
    'https://*.twitter.com',
    'https://*.x.com',
    'https://*.google.com',
    'https://stackblitz.com',
    'https://*.vercel-insights.com',
    'https://www.google-analytics.com',
    'https://api.github.com',
    'https://ipapi.co',
    'https://api.openweathermap.org',
    'https://api.open-meteo.com',
    'https://unpkg.com',
    'https://piped.video',
    'https://*.vercel-scripts.com',
  ],
  "frame-src": [
    "'self'",
    'blob:',
    'https://vercel.live',
    'https://stackblitz.com',
    'https://ghbtns.com',
    'https://platform.twitter.com',
    'https://syndication.twitter.com',
    'https://*.twitter.com',
    'https://*.x.com',
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
    'https://open.spotify.com',
    'https://todoist.com',
    'https://example.com',
    'https://developer.mozilla.org',
    'https://en.wikipedia.org',
    'https://*.google.com',
  ],
  "worker-src": ["'self'", 'blob:'],
  "frame-ancestors": ["'self'"],
  'upgrade-insecure-requests': [],
};

function replaceNonce(value, nonce) {
  return value.includes('__CSP_NONCE__')
    ? value.replace('__CSP_NONCE__', nonce)
    : value;
}

function createContentSecurityPolicy(nonce = CSP_NONCE_PLACEHOLDER) {
  return Object.entries(cspDirectives)
    .map(([directive, values]) => {
      if (values.length === 0) {
        return directive;
      }
      const resolved = values.map((value) => replaceNonce(value, nonce));
      return `${directive} ${resolved.join(' ')}`;
    })
    .join('; ');
}

module.exports = {
  CSP_NONCE_PLACEHOLDER,
  cspDirectives,
  createContentSecurityPolicy,
};

