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

export function middleware(req: NextRequest | { headers: Headers; nextUrl?: URL; url?: string }) {
  const url =
    (req as any).nextUrl ?? new URL((req as any).url || '/', 'http://localhost');
  const { pathname } = url;
  const shouldRedirect = Boolean((req as any).nextUrl);
  if (
    shouldRedirect &&
    (pathname === `/${defaultLocale}` || pathname.startsWith(`/${defaultLocale}/`))
  ) {
    const newPath = pathname.replace(`/${defaultLocale}`, '') || '/';
    return NextResponse.redirect(
      new URL(newPath, (req as any).url || 'http://localhost')
    );
  }
  if (
    shouldRedirect &&
    !PUBLIC_FILE.test(pathname) &&
    !pathname.startsWith('/_next') &&
    !pathname.includes('/api') &&
    !locales.some((loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`))
  ) {
    const language = req.headers
      .get('accept-language')
      ?.split(',')[0]
      .split('-')[0];
    const locale = locales.includes(language ?? '') ? language! : defaultLocale;
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, (req as any).url || 'http://localhost')
    );
  }

  const n = nonce();
  const csp = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `script-src 'self' 'nonce-${n}' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.twimg.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://sdk.scdn.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
    "connect-src 'self' https://example.com https://*.twitter.com https://*.twimg.com https://*.x.com https://*.google.com https://stackblitz.com",
    "frame-src 'self' https://vercel.live https://stackblitz.com https://*.google.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com https://react.dev https://example.com",
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
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'same-origin');
    res.headers.set(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!public|_next/static|_next/image|favicon\.ico|robots\.txt|sitemap\.xml|manifest\.webmanifest|sw\.js|workbox-.*\.js).*)'
  ]
};
