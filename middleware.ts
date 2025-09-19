import { NextResponse, type NextRequest } from 'next/server';
import { createContentSecurityPolicy } from './lib/csp';

function nonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

export function middleware(_req: NextRequest) {
  if (process.env.NEXT_SECURITY_HEADERS === 'off') {
    return NextResponse.next();
  }
  const n = nonce();
  const res = NextResponse.next();
  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', createContentSecurityPolicy(n));
  return res;
}
