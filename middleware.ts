import { NextResponse, type NextRequest } from 'next/server';

const PERMISSIONS_POLICY_BASE = {
  camera: '()',
  microphone: '()',
  geolocation: '()',
  'interest-cohort': '()',
} as const;

type PermissionDirective = keyof typeof PERMISSIONS_POLICY_BASE;

function serializePermissionsPolicy(
  overrides: Partial<Record<PermissionDirective, string>> = {},
): string {
  return (Object.keys(PERMISSIONS_POLICY_BASE) as PermissionDirective[])
    .map((directive) => {
      const value = overrides[directive] ?? PERMISSIONS_POLICY_BASE[directive];
      return `${directive}=${value}`;
    })
    .join(', ');
}

export const DEFAULT_PERMISSIONS_POLICY = serializePermissionsPolicy();

export const CAMERA_ENABLED_PERMISSIONS_POLICY = serializePermissionsPolicy({
  camera: '(self)',
});

function nonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64');
}

export function middleware(req: NextRequest) {
  const n = nonce();
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    // Allow Next.js development bundles (which rely on eval) when running automation
    ...(process.env.NODE_ENV !== 'production' ? ["'unsafe-eval'"] : []),
    `'nonce-${n}'`,
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
  ];

  const csp = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `script-src ${scriptSrc.join(' ')}`,
    "connect-src 'self' https://cdn.syndication.twimg.com https://*.twitter.com https://embed.x.com https://stackblitz.com",
    "frame-src 'self' https://vercel.live https://stackblitz.com https://ghbtns.com https://platform.twitter.com https://embed.x.com https://open.spotify.com https://todoist.com https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  const res = NextResponse.next();
  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', csp);
  const pathname = req.nextUrl.pathname;
  const allowCamera = pathname === '/qr' || pathname.startsWith('/qr/');
  res.headers.set(
    'Permissions-Policy',
    allowCamera ? CAMERA_ENABLED_PERMISSIONS_POLICY : DEFAULT_PERMISSIONS_POLICY,
  );
  return res;
}
