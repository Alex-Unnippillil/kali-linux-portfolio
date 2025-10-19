import { NextResponse, type NextRequest } from 'next/server';

const REPORT_GROUP = 'csp-endpoint';

function createNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

function buildCsp({
  nonce,
  reportUrl,
  environment,
}: {
  nonce: string;
  reportUrl: string;
  environment: string | undefined;
}): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    'https://vercel.live',
    'https://platform.twitter.com',
    'https://embed.x.com',
    'https://syndication.twitter.com',
    'https://cdn.syndication.twimg.com',
    'https://www.youtube.com',
    'https://www.google.com',
    'https://www.gstatic.com',
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
  ];

  if (environment !== 'production') {
    scriptSrc.push("'unsafe-eval'");
  }

  const connectSrc = [
    "'self'",
    'https://cdn.syndication.twimg.com',
    'https://*.twitter.com',
    'https://embed.x.com',
    'https://stackblitz.com',
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com',
    'https://vitals.vercel-insights.com',
    'https://vitals.vercel-analytics.com',
    'https://vercel.live',
    'https://ipapi.co',
    'https://unpkg.com',
    'https://api.open-meteo.com',
    'https://geocoding-api.open-meteo.com',
    'https://api.openweathermap.org',
    'https://api.exchangerate.host',
    'https://api.github.com',
    'https://api.allorigins.win',
    'https://api.hackertarget.com',
    'https://api.emailjs.com',
    'wss:',
    'ws:',
  ];

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "img-src 'self' data: blob: https:",
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `script-src ${scriptSrc.join(' ')}`,
    `connect-src ${connectSrc.join(' ')}`,
    "frame-src 'self' https://vercel.live https://stackblitz.com https://ghbtns.com https://platform.twitter.com https://embed.x.com https://open.spotify.com https://todoist.com https://www.youtube.com https://www.youtube-nocookie.com",
    `report-uri ${reportUrl}`,
    `report-to ${REPORT_GROUP}`,
  ];

  return directives.join('; ');
}

export function middleware(req: NextRequest) {
  const nonce = createNonce();
  const reportUrl = `${req.nextUrl.origin}/api/csp-report`;
  const policy = buildCsp({ nonce, reportUrl, environment: process.env.NODE_ENV });

  const res = NextResponse.next();
  res.headers.set('x-csp-nonce', nonce);
  res.headers.set('Content-Security-Policy', policy);
  res.headers.set('Content-Security-Policy-Report-Only', policy);
  res.headers.set(
    'Report-To',
    JSON.stringify({
      group: REPORT_GROUP,
      max_age: 108864,
      endpoints: [{ url: reportUrl }],
    })
  );
  return res;
}
