import { NextResponse, type NextRequest } from 'next/server';

function nonce() {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...arr));
}

export function middleware(req: NextRequest) {
  const n = nonce();
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    // Allow Next.js development bundles (which rely on eval) when running automation
    ...(process.env.NODE_ENV !== 'production' ? ["'unsafe-eval'"] : []),
    `'nonce-${n}'`,
    'https://vercel.live',
    'https://platform.twitter.com',
    'https://embed.x.com',
    'https://syndication.twitter.com',
    'https://cdn.syndication.twimg.com',
    'https://www.youtube.com',
    'https://www.google.com',
    'https://www.gstatic.com',
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com',
  ];

  const csp = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `script-src ${scriptSrc.join(' ')}`,
    "connect-src 'self' https://cdn.syndication.twimg.com https://*.twitter.com https://embed.x.com https://stackblitz.com",
    "frame-src 'self' https://vercel.live https://stackblitz.com https://ghbtns.com https://platform.twitter.com https://embed.x.com https://open.spotify.com https://todoist.com https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  const res = NextResponse.next();
  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', csp);
  return res;
}
