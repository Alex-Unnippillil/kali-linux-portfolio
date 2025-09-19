#!/usr/bin/env node

const target = process.argv[2] ?? 'http://localhost:3000';

const REQUIRED_HEADERS = [
  { key: 'content-security-policy', weight: 40, label: 'Content-Security-Policy' },
  { key: 'strict-transport-security', weight: 20, label: 'Strict-Transport-Security' },
  { key: 'x-content-type-options', weight: 10, label: 'X-Content-Type-Options' },
  { key: 'x-frame-options', weight: 10, label: 'X-Frame-Options' },
  { key: 'referrer-policy', weight: 10, label: 'Referrer-Policy' },
  { key: 'permissions-policy', weight: 10, label: 'Permissions-Policy' },
];

const GRADES = [
  { minScore: 90, grade: 'A+' },
  { minScore: 80, grade: 'A' },
  { minScore: 70, grade: 'B' },
  { minScore: 60, grade: 'C' },
  { minScore: 50, grade: 'D' },
  { minScore: 0, grade: 'F' },
];

function gradeFor(score) {
  return GRADES.find(({ minScore }) => score >= minScore)?.grade ?? 'F';
}

async function main() {
  const response = await fetch(target, { redirect: 'manual' });
  const headers = Object.fromEntries(response.headers.entries());

  let score = 0;
  const missing = [];
  const present = [];
  for (const header of REQUIRED_HEADERS) {
    if (headers[header.key]) {
      score += header.weight;
      present.push({ ...header, value: headers[header.key] });
    } else {
      missing.push(header);
    }
  }

  const cspValue = headers['content-security-policy'] ?? '';
  const scriptDirective = cspValue
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith('script-src'));
  const hasUnsafeInlineInScripts = /script-src[^;]*'unsafe-inline'/.test(scriptDirective ?? '');
  const hasNonce = /script-src[^;]*'nonce-[^']+'/.test(scriptDirective ?? '');

  const grade = gradeFor(score);

  console.log(`Security headers report for ${target}`);
  console.log(`HTTP status: ${response.status}`);
  console.log('');
  console.log(`Grade: ${grade} (score ${score}/100)`);
  console.log('Present headers:');
  for (const header of present) {
    console.log(`  • ${header.label}: ${header.value}`);
  }

  if (missing.length > 0) {
    console.log('Missing headers:');
    for (const header of missing) {
      console.log(`  • ${header.label}`);
    }
  } else {
    console.log('Missing headers: none');
  }

  console.log('');
  if (scriptDirective) {
    console.log(`script-src directive: ${scriptDirective}`);
    console.log(` - Contains nonce: ${hasNonce ? 'yes' : 'no'}`);
    console.log(` - Contains 'unsafe-inline': ${hasUnsafeInlineInScripts ? 'yes' : 'no'}`);
  } else {
    console.log('No script-src directive found in CSP.');
  }
}

main().catch((error) => {
  console.error(`Failed to evaluate security headers for ${target}`);
  console.error(error);
  process.exitCode = 1;
});

