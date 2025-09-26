#!/usr/bin/env node

const normalizeUrl = (input) => {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const normalizeValue = (value) =>
  value
    .replace(/\s*;\s*/g, '; ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

const REQUIRED_HEADERS = {
  'content-security-policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline'",
    "style-src-elem 'self' 'unsafe-inline'",
    "font-src 'self'",
    "script-src 'self' 'unsafe-inline' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "connect-src 'self' https://example.com https://developer.mozilla.org https://en.wikipedia.org https://www.google.com https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://*.google.com https://stackblitz.com",
    "frame-src 'self' https://vercel.live https://stackblitz.com https://*.google.com https://platform.twitter.com https://syndication.twitter.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com https://example.com https://developer.mozilla.org https://en.wikipedia.org",
    "frame-ancestors 'self'",
    'upgrade-insecure-requests',
  ].join('; '),
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=*',
  'x-frame-options': 'SAMEORIGIN',
};

const main = async () => {
  const url =
    normalizeUrl(process.argv[2]) ||
    normalizeUrl(process.env.VERCEL_PREVIEW_URL) ||
    normalizeUrl(process.env.VERCEL_BRANCH_URL) ||
    normalizeUrl(process.env.VERCEL_URL);

  if (!url) {
    console.error(
      'Usage: node scripts/check-security-headers.mjs <preview-url>\nSet VERCEL_PREVIEW_URL, VERCEL_BRANCH_URL, or VERCEL_URL.',
    );
    process.exit(1);
  }

  console.log(`Fetching ${url} to validate security headers...`);

  let response;
  try {
    response = await fetch(url, { redirect: 'manual' });
  } catch (error) {
    console.error('Failed to fetch preview URL:', error.message);
    process.exit(1);
  }

  if (response.status >= 400) {
    console.error(`Received HTTP ${response.status} from ${url}`);
    process.exit(1);
  }

  const missing = [];
  const mismatched = [];

  for (const [header, expectedValue] of Object.entries(REQUIRED_HEADERS)) {
    const actual = response.headers.get(header);
    if (!actual) {
      missing.push(header);
      continue;
    }

    const normalizedActual = normalizeValue(actual);
    const normalizedExpected = normalizeValue(expectedValue);

    if (normalizedActual !== normalizedExpected) {
      mismatched.push({ header, expectedValue, actual });
    }
  }

  if (missing.length || mismatched.length) {
    if (missing.length) {
      console.error('Missing headers:', missing.join(', '));
    }
    if (mismatched.length) {
      console.error('Headers with unexpected values:');
      for (const { header, expectedValue, actual } of mismatched) {
        console.error(`  - ${header}`);
        console.error(`    Expected: ${expectedValue}`);
        console.error(`    Received: ${actual}`);
      }
    }
    process.exit(1);
  }

  console.log('All required security headers are present with expected values.');
};

main();
