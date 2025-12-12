import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, securityHeaders } from './lib/csp';

function nonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

export function middleware(req: NextRequest) {
  const n = nonce();
  const csp = buildCsp({ nonce: n, isDev: process.env.NODE_ENV !== 'production' });

  const res = NextResponse.next();
  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', csp);
  for (const header of securityHeaders) {
    res.headers.set(header.key, header.value);
  }
  if (req.nextUrl.pathname.startsWith('/admin')) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}
