import { NextResponse, type NextRequest } from 'next/server';
import { createCsp, getBaseDirectiveValues } from './lib/csp';

const SENSITIVE_ROUTE_PATTERNS = [/^\/admin(?:\/|$)/, /^\/dummy-form$/];

function nonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

export function middleware(req: NextRequest) {
  const n = nonce();
  const scriptSrc = getBaseDirectiveValues('script-src');
  scriptSrc.push(`'nonce-${n}'`);

  const pathname = req.nextUrl.pathname;
  const isSensitive = SENSITIVE_ROUTE_PATTERNS.some((pattern) =>
    pattern.test(pathname)
  );

  const overrides = {
    'script-src': scriptSrc,
    ...(isSensitive && {
      'connect-src': ["'self'"],
      'frame-src': ["'none'"],
    }),
  };

  const csp = createCsp(overrides);

  const res = NextResponse.next();
  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', csp);
  return res;
}
