import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp } from './lib/csp/sources';

function nonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

export function middleware(req: NextRequest) {
  const n = nonce();
  const csp = buildCsp({
    nonce: n,
    allowUnsafeEval: process.env.NODE_ENV !== 'production',
  });

  const res = NextResponse.next();
  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', csp);
  return res;
}
