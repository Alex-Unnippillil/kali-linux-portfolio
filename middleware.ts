import { NextResponse, type NextRequest } from 'next/server';

function nonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

export function middleware(req: NextRequest) {
  const n = nonce();
  const scriptSrc = [
    "'self'",
    `'nonce-${n}'`,
    ...(process.env.NODE_ENV !== 'production' ? ["'unsafe-eval'"] : []),
    'https://vercel.live',
    'https://platform.twitter.com',
    'https://syndication.twitter.com',
    'https://cdn.syndication.twimg.com',
    'https://www.youtube.com',
    'https://www.google.com',
    'https://www.gstatic.com',
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com',
  ];

  const connectSrc = [
    "'self'",
    'https://cdn.syndication.twimg.com',
    'https://*.twitter.com',
    'https://stackblitz.com',
    'https://vercel.live',
  ];

  const origin = req.nextUrl.origin;
  const reportUri = `${origin}/api/csp-report`;
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https: data:",
    `connect-src ${connectSrc.join(' ')}`,
    "worker-src 'self' blob:",
    "frame-src 'self' https://vercel.live https://stackblitz.com https://ghbtns.com https://platform.twitter.com https://open.spotify.com https://todoist.com https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
    'upgrade-insecure-requests',
    `report-uri ${reportUri}`,
    'report-to csp-endpoint',
    "require-trusted-types-for 'script'",
    'trusted-types app-html dompurify',
  ];

  const csp = directives.join('; ');
  const reportOnly = process.env.CSP_REPORT_ONLY !== 'false';
  const res = NextResponse.next();
  const headerName = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

  if (!reportOnly) {
    res.headers.delete('Content-Security-Policy-Report-Only');
  }

  res.headers.set('x-csp-nonce', n);
  res.headers.set(headerName, csp);
  res.headers.set(
    'Report-To',
    JSON.stringify({
      group: 'csp-endpoint',
      max_age: 10886400,
      endpoints: [{ url: reportUri }],
    }),
  );
  res.headers.set('Reporting-Endpoints', `csp="${reportUri}"`);

  return res;
}
