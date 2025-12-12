const BASE_SCRIPT_SRC = [
  "'self'",
  "'unsafe-inline'",
  'https://vercel.live',
  'https://platform.twitter.com',
  'https://embed.x.com',
  'https://syndication.twitter.com',
  'https://cdn.syndication.twimg.com',
  'https://*.twitter.com',
  'https://*.x.com',
  'https://www.youtube.com',
  'https://www.google.com',
  'https://www.gstatic.com',
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com',
];

const CONNECT_SRC = [
  "'self'",
  'https://example.com',
  'https://developer.mozilla.org',
  'https://en.wikipedia.org',
  'https://www.google.com',
  'https://platform.twitter.com',
  'https://embed.x.com',
  'https://syndication.twitter.com',
  'https://cdn.syndication.twimg.com',
  'https://*.twitter.com',
  'https://*.x.com',
  'https://*.google.com',
  'https://stackblitz.com',
];

const FRAME_SRC = [
  "'self'",
  'https://vercel.live',
  'https://stackblitz.com',
  'https://*.google.com',
  'https://platform.twitter.com',
  'https://embed.x.com',
  'https://syndication.twitter.com',
  'https://*.twitter.com',
  'https://*.x.com',
  'https://ghbtns.com',
  'https://www.youtube.com',
  'https://www.youtube-nocookie.com',
  'https://open.spotify.com',
  'https://todoist.com',
  'https://example.com',
  'https://developer.mozilla.org',
  'https://en.wikipedia.org',
];

const IMG_SRC = ["'self'", 'https:', 'data:'];

export function buildCsp({ nonce, isDev }: { nonce?: string; isDev?: boolean }) {
  const scriptSrc = [...BASE_SCRIPT_SRC];
  if (nonce) {
    scriptSrc.push(`'nonce-${nonce}'`);
  }
  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    `img-src ${IMG_SRC.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-elem 'self' 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    `script-src ${scriptSrc.join(' ')}`,
    `connect-src ${CONNECT_SRC.join(' ')}`,
    `frame-src ${FRAME_SRC.join(' ')}`,
    "frame-ancestors 'self'",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}

export const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
];
