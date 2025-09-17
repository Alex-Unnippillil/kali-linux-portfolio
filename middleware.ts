import { NextResponse, type NextRequest } from 'next/server';

const REPORTING_GROUP = 'csp-endpoint';
const DEFAULT_REPORTING_PATH = '/api/reporting/csp';
const enableSecurityReporting =
  process.env.ENABLE_CSP_REPORTING === 'true' ||
  (process.env.NODE_ENV !== 'production' && process.env.ENABLE_CSP_REPORTING !== 'false');
const configuredReportUri = process.env.CSP_REPORT_URI || DEFAULT_REPORTING_PATH;
const configuredReportTo = process.env.CSP_REPORT_ENDPOINT || configuredReportUri;

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
    `script-src 'self' 'unsafe-inline' 'nonce-${n}' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
    "connect-src 'self' https://cdn.syndication.twimg.com https://*.twitter.com https://stackblitz.com",
    "frame-src 'self' https://vercel.live https://stackblitz.com https://ghbtns.com https://platform.twitter.com https://open.spotify.com https://todoist.com https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(enableSecurityReporting
      ? [`report-to ${REPORTING_GROUP}`, `report-uri ${configuredReportUri}`]
      : []),
  ].join('; ');

  const res = NextResponse.next();
  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', csp);
  if (enableSecurityReporting) {
    const origin = req.nextUrl.origin;
    let resolvedReportTo = configuredReportTo;
    try {
      resolvedReportTo = new URL(configuredReportTo, origin).toString();
    } catch {
      resolvedReportTo = new URL(DEFAULT_REPORTING_PATH, origin).toString();
    }
    res.headers.set(
      'Report-To',
      JSON.stringify({
        group: REPORTING_GROUP,
        max_age: 10886400,
        endpoints: [{ url: resolvedReportTo }],
      })
    );
    res.headers.set('Reporting-Endpoints', `${REPORTING_GROUP}="${resolvedReportTo}"`);
  }
  return res;
}
