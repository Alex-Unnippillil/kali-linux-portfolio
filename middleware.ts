import { NextResponse, type NextRequest } from 'next/server';

const locales = ['en', 'es'];
const defaultLocale = 'en';
const PUBLIC_FILE = /\.(.*)$/;

function nonce() {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  let str = '';
  arr.forEach((v) => {
    str += String.fromCharCode(v);
  });
  return btoa(str);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    !PUBLIC_FILE.test(pathname) &&
    !pathname.startsWith('/_next') &&
    !pathname.includes('/api') &&
    !locales.some((loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`))
  ) {
    const language = req.headers.get('accept-language')?.split(',')[0].split('-')[0];
    const locale = locales.includes(language ?? '') ? language! : defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, req.url));
  }

  const n = nonce();
  const csp = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `script-src 'self' 'unsafe-inline' 'nonce-${n}' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://sdk.scdn.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
    "connect-src 'self' https://cdn.syndication.twimg.com https://*.twitter.com *.x.com https://sdk.scdn.co",
    "frame-src 'self' https://vercel.live https://stackblitz.com https://ghbtns.com https://platform.twitter.com https://open.spotify.com https://todoist.com https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-csp-nonce', n);
  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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
