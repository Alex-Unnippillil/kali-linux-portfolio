import { NextResponse, type NextRequest } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'es', 'de'] as const;
const DEFAULT_LOCALE = SUPPORTED_LOCALES[0];

function nonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

function applyCspHeaders(response: NextResponse, nonceValue: string) {
  const csp = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `script-src 'self' 'unsafe-inline' 'nonce-${nonceValue}' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
    "connect-src 'self' https://cdn.syndication.twimg.com https://*.twitter.com https://stackblitz.com",
    "frame-src 'self' https://vercel.live https://stackblitz.com https://ghbtns.com https://platform.twitter.com https://open.spotify.com https://todoist.com https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  response.headers.set('x-csp-nonce', nonceValue);
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

function hasLocalePrefix(pathname: string) {
  return SUPPORTED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
}

export function middleware(req: NextRequest) {
  const nonceValue = nonce();
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/_next')) {
    return applyCspHeaders(NextResponse.next(), nonceValue);
  }

  if (!hasLocalePrefix(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`;
    return applyCspHeaders(NextResponse.rewrite(url), nonceValue);
  }

  return applyCspHeaders(NextResponse.next(), nonceValue);
}

export const config = {
  matcher: [
    '/',
    '/((?!api|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|workbox-|.*\\..*).*)',
  ],
};
