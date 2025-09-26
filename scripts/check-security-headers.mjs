#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = path.resolve(new URL('..', import.meta.url).pathname);

function readFile(relativePath) {
  const filePath = path.join(root, relativePath);
  return fs.readFileSync(filePath, 'utf8');
}

function extractBlock(content, regex, label) {
  const match = content.match(regex);
  if (!match) {
    throw new Error(`Unable to locate ${label} block`);
  }
  return match[1];
}

function normalizeDomain(token) {
  return token
    .replace(/^https?:\/\//, '')
    .replace(/["'`,;\)]*$/g, '')
    .trim();
}

function extractDomainsFromBlock(block) {
  const stringLiteral = /(["'`])([\s\S]*?)\1/g;
  const domainPattern = /https?:\/\/[^\s"'`,;\)]+/g;
  const domains = new Set();

  for (const [, , content] of block.matchAll(stringLiteral)) {
    const matches = content.match(domainPattern);
    if (!matches) continue;
    for (const match of matches) {
      const normalized = normalizeDomain(match);
      if (normalized) {
        domains.add(normalized);
      }
    }
  }

  return domains;
}

function diffDomains(base, candidate) {
  const missing = [...base].filter((domain) => !candidate.has(domain));
  const extra = [...candidate].filter((domain) => !base.has(domain));
  return { missing, extra };
}

function formatDiff(label, diff) {
  const lines = [];
  if (diff.missing.length > 0) {
    lines.push(`  Missing in ${label}: ${diff.missing.join(', ')}`);
  }
  if (diff.extra.length > 0) {
    lines.push(`  Extra in ${label}: ${diff.extra.join(', ')}`);
  }
  return lines;
}

const nextConfig = readFile('next.config.js');
const cspBlock = extractBlock(
  nextConfig,
  /const ContentSecurityPolicy = \[([\s\S]*?)\]\s*\.join/,
  'ContentSecurityPolicy in next.config.js',
);
const canonicalDomains = extractDomainsFromBlock(cspBlock);

const targets = [
  {
    label: 'middleware.ts',
    path: 'middleware.ts',
    regex: /const csp = \[([\s\S]*?)\]\s*\.join/,
  },
  {
    label: 'tests/security header expectations',
    path: '__tests__/security-headers.test.ts',
    regex: /const [^=]+= \[([\s\S]*?)\]/,
    optional: true,
  },
  {
    label: 'playwright security header tests',
    path: 'tests/security-headers.spec.ts',
    regex: /const [^=]+= \[([\s\S]*?)\]/,
    optional: true,
  },
];

let hasError = false;

for (const target of targets) {
  const filePath = path.join(root, target.path);
  if (!fs.existsSync(filePath)) {
    if (target.optional) continue;
    throw new Error(`Required file ${target.path} not found`);
  }
  const content = readFile(target.path);
  const block = extractBlock(
    content,
    target.regex,
    `${target.label} domain list`,
  );
  const domains = extractDomainsFromBlock(block);
  const diff = diffDomains(canonicalDomains, domains);
  const messages = formatDiff(target.label, diff);
  if (messages.length > 0) {
    hasError = true;
    console.error(`Security header mismatch for ${target.path}:`);
    for (const msg of messages) {
      console.error(msg);
    }
  }
}

if (hasError) {
  console.error('\nTo update, sync the domain list in next.config.js with the other sources.');
  process.exit(1);
}

console.log('Security header domains are consistent.');
