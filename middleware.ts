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

  const connectSrc = [
    "'self'",
    'https://cdn.syndication.twimg.com',
    'https://*.twitter.com',
    'https://*.x.com',
    'https://embed.x.com',
    'https://stackblitz.com',
    'https://www.google.com',
    'https://www.googleapis.com',
    'https://www.gstatic.com',
    'https://*.googleapis.com',
    'https://api.github.com',
    'https://ipapi.co',
    'https://unpkg.com',
    'https://*.supabase.co',
  ];

  const frameSrc = [
    "'self'",
    'https://vercel.live',
    'https://stackblitz.com',
    'https://vscode.dev',
    'https://ghbtns.com',
    'https://platform.twitter.com',
    'https://embed.x.com',
    'https://open.spotify.com',
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
    'https://www.google.com',
    'https://www.gstatic.com',
  ];

  const csp = (
    [
      ["default-src", ["'self'"]],
      ['base-uri', ["'self'"]],
      ['form-action', ["'self'"]],
      ['object-src', ["'none'"]],
      ['img-src', ["'self'", 'https:', 'data:']],
      ['style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']],
      ['font-src', ["'self'", 'https://fonts.gstatic.com']],
      ['script-src', scriptSrc],
      ['connect-src', connectSrc],
      ['frame-src', frameSrc],
      ['frame-ancestors', ["'self'"]],
      ['upgrade-insecure-requests', []],
    ] as const
  )
    .map(([directive, values]) =>
      values.length ? `${directive} ${values.join(' ')}` : directive,
    )
    .join('; ');

  const res = NextResponse.next();
  res.headers.set('x-csp-nonce', n);
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=*',
  );
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return res;
}
