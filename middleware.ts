import { NextResponse, type NextRequest } from 'next/server';
import {
  scriptSrcHosts,
  connectSrcHosts,
  frameSrcHosts,
} from './lib/csp';

function nonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

export function middleware(req: NextRequest) {
  const n = nonce();
  const csp = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `script-src 'self' 'unsafe-inline' 'nonce-${n}' ${scriptSrcHosts.join(' ')}`,
    `connect-src 'self' ${connectSrcHosts.join(' ')}`,
    `frame-src 'self' ${frameSrcHosts.join(' ')}`,
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
