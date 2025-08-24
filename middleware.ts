import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASE_CSP = [
  "default-src 'self'",
  "img-src 'self' https: data:",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "script-src 'self' 'nonce-__CSP_NONCE__' https://platform.twitter.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "connect-src 'self' https://cdn.syndication.twimg.com https://*.twitter.com https://stackblitz.com https://api.axiom.co",
  "frame-src 'self' https://stackblitz.com https://ghbtns.com https://platform.twitter.com https://open.spotify.com https://todoist.com https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "report-to csp-endpoint",
].join('; ');

function generateNonce(): string {
  const array = crypto.getRandomValues(new Uint8Array(16));
  let str = '';
  array.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str);
}

export function middleware(req: NextRequest) {
  const nonce = generateNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const csp = BASE_CSP.replace(/__CSP_NONCE__/g, nonce);
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

