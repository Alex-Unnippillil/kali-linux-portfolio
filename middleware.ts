import { NextResponse, type NextRequest } from 'next/server';

import {
  MIDDLEWARE_CSP_EXTENSIONS,
  TRUSTED_CSP_DIRECTIVES,
  mergeCspSources,
} from '@/lib/security/origins';

function nonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

export function middleware(req: NextRequest) {
  const n = nonce();
  const scriptSources = mergeCspSources(
    ["'self'", "'unsafe-inline'", `'nonce-${n}'`],
    TRUSTED_CSP_DIRECTIVES.scriptSrc,
    MIDDLEWARE_CSP_EXTENSIONS.scriptSrc,
  );
  const connectSources = mergeCspSources(
    ["'self'"],
    TRUSTED_CSP_DIRECTIVES.connectSrc,
    MIDDLEWARE_CSP_EXTENSIONS.connectSrc,
  );
  const frameSources = mergeCspSources(
    ["'self'"],
    TRUSTED_CSP_DIRECTIVES.frameSrc,
    MIDDLEWARE_CSP_EXTENSIONS.frameSrc,
  );
  const styleSources = mergeCspSources(
    ["'self'", "'unsafe-inline'"],
    TRUSTED_CSP_DIRECTIVES.styleSrc,
    MIDDLEWARE_CSP_EXTENSIONS.styleSrc,
  );
  const fontSources = mergeCspSources(
    ["'self'"],
    TRUSTED_CSP_DIRECTIVES.fontSrc,
    MIDDLEWARE_CSP_EXTENSIONS.fontSrc,
  );

  const csp = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    `style-src ${styleSources.join(' ')}`,
    `font-src ${fontSources.join(' ')}`,
    `script-src ${scriptSources.join(' ')}`,
    `connect-src ${connectSources.join(' ')}`,
    `frame-src ${frameSources.join(' ')}`,
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  const res = NextResponse.next();
  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', csp);
  return res;
}
