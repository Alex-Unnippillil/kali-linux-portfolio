import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from './i18n';
import fs from 'fs';
import path from 'path';

function nonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix,
});

function applyCsp(res: NextResponse) {
  const n = nonce();
  const csp = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `script-src 'self' 'unsafe-inline' 'nonce-${n}' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
    "connect-src 'self' https://cdn.syndication.twimg.com https://*.twitter.com https://stackblitz.com",
    "frame-src 'self' https://vercel.live https://stackblitz.com https://ghbtns.com https://platform.twitter.com https://open.spotify.com https://todoist.com https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const locale = pathname.split('/')[1];
  if (locale) {
    if (!locales.includes(locale)) {
      return applyCsp(NextResponse.rewrite(new URL('/404', req.url)));
    }
    const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
    if (!fs.existsSync(messagesPath)) {
      return applyCsp(NextResponse.rewrite(new URL('/404', req.url)));
    }
  }
  const res = intlMiddleware(req);
  return applyCsp(res);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
