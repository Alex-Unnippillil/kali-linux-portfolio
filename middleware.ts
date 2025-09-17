import { NextResponse, type NextRequest } from 'next/server';
import { createLogger } from './lib/logger';
import {
  kioskAppLabel,
  kioskSessionCookieName,
  isKioskRouteAllowed,
  normalizePathname,
} from './lib/kiosk';

const KIOSK_SESSION_HEADER = 'x-kiosk-session';

function nonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

function buildCsp(n: string) {
  return [
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
    "form-action 'self'",
  ].join('; ');
}

function applySecurityHeaders(res: NextResponse, n: string) {
  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', buildCsp(n));
}

function parseToggle(value: string | null | undefined): boolean | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'active', 'enabled'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off', 'inactive', 'disabled'].includes(normalized)) {
    return false;
  }
  return null;
}

function isHtmlNavigation(req: NextRequest): boolean {
  const accept = req.headers.get('accept');
  return typeof accept === 'string' && accept.includes('text/html');
}

function commitKioskCookie(res: NextResponse, isKiosk: boolean, req: NextRequest) {
  if (isKiosk) {
    res.cookies.set(kioskSessionCookieName, '1', {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 12,
      secure: req.nextUrl.protocol === 'https:',
    });
  } else {
    res.cookies.delete(kioskSessionCookieName);
  }
}

function attemptedAppSlug(pathname: string): string | null {
  const normalized = normalizePathname(pathname);
  if (!normalized.startsWith('/apps/')) {
    return null;
  }
  return normalized.slice('/apps/'.length);
}

export function middleware(req: NextRequest) {
  const nonceValue = nonce();
  const url = req.nextUrl.clone();

  const queryToggle = parseToggle(url.searchParams.get('kiosk'));
  if (queryToggle !== null) {
    url.searchParams.delete('kiosk');
    const redirect = NextResponse.redirect(url);
    commitKioskCookie(redirect, queryToggle, req);
    redirect.headers.set('x-kiosk-mode', queryToggle ? 'active' : 'inactive');
    applySecurityHeaders(redirect, nonceValue);
    return redirect;
  }

  const headerSignal = parseToggle(req.headers.get(KIOSK_SESSION_HEADER));
  const cookieSignal = parseToggle(req.cookies.get(kioskSessionCookieName)?.value);
  const isKioskSession = headerSignal ?? cookieSignal ?? false;

  const normalizedPath = normalizePathname(req.nextUrl.pathname);
  if (isKioskSession && isHtmlNavigation(req) && !isKioskRouteAllowed(normalizedPath)) {
    const blockedUrl = req.nextUrl.clone();
    blockedUrl.pathname = '/kiosk-blocked';
    blockedUrl.search = '';
    const originalPathWithQuery = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    if (originalPathWithQuery) {
      blockedUrl.searchParams.set('from', originalPathWithQuery);
    }
    const appSlug = attemptedAppSlug(req.nextUrl.pathname);
    if (appSlug) {
      blockedUrl.searchParams.set('app', appSlug);
    }

    const response = NextResponse.rewrite(blockedUrl);
    commitKioskCookie(response, true, req);
    response.headers.set('x-kiosk-mode', 'active');
    response.headers.set('Cache-Control', 'no-store');
    applySecurityHeaders(response, nonceValue);

    const logger = createLogger();
    const label = appSlug ? kioskAppLabel(appSlug) ?? appSlug : normalizedPath;
    logger.warn('Blocked kiosk navigation', {
      attempted: label,
      path: normalizedPath,
      ip: req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown',
      referer: req.headers.get('referer') ?? undefined,
    });

    return response;
  }

  const res = NextResponse.next();
  commitKioskCookie(res, isKioskSession, req);
  res.headers.set('x-kiosk-mode', isKioskSession ? 'active' : 'inactive');
  applySecurityHeaders(res, nonceValue);
  return res;
}
