import { NextResponse, type NextRequest } from 'next/server';

function nonce() {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  let str = '';
  arr.forEach((v) => {
    str += String.fromCharCode(v);
  });
  return btoa(str);
}

export function middleware(req: NextRequest) {
  const n = nonce();
  const csp = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `script-src 'self' 'unsafe-inline' 'nonce-${n}' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://sdk.scdn.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
    "connect-src 'self' https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://stackblitz.com",
    "frame-src 'self' https://vercel.live https://stackblitz.com https://ghbtns.com https://platform.twitter.com https://open.spotify.com https://todoist.com https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  const res = NextResponse.next();
  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', csp);
  if (req.headers.get('accept')?.includes('text/html')) {
    res.headers.set('X-Content-Type-Options', 'nosniff');
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!public|_next/static|_next/image|favicon\.ico|robots\.txt|sitemap\.xml|manifest\.webmanifest|sw\.js|workbox-.*\.js).*)'
  ]
};
