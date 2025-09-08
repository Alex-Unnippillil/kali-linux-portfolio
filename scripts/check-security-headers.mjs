#!/usr/bin/env node

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/check-security-headers.mjs <url>');
  process.exit(1);
}

const res = await fetch(url, { headers: { Accept: 'text/html' } });

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const csp = res.headers.get('content-security-policy');
if (!csp || !csp.includes("default-src 'self'")) {
  fail(`Invalid Content-Security-Policy: ${csp}`);
}

const hsts = res.headers.get('strict-transport-security');
if (!hsts || !/max-age=\d+/.test(hsts)) {
  fail(`Invalid Strict-Transport-Security: ${hsts}`);
}

const xcto = res.headers.get('x-content-type-options');
if (xcto !== 'nosniff') {
  fail(`Invalid X-Content-Type-Options: ${xcto}`);
}

const referrer = res.headers.get('referrer-policy');
if (referrer !== 'no-referrer') {
  fail(`Invalid Referrer-Policy: ${referrer}`);
}

console.log('Security headers validated');
