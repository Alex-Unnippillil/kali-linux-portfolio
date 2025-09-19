#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const licenseChecker = require('license-checker');
const parseSpdxExpression = require('spdx-expression-parse');

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const allowlistPath = path.resolve(projectRoot, 'config', 'license-allowlist.json');
const reportsDir = path.resolve(projectRoot, 'reports');
const reportPath = path.join(reportsDir, 'license-report.json');

async function loadAllowlist() {
  const raw = await readFile(allowlistPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed || !Array.isArray(parsed.allowedLicenses) || parsed.allowedLicenses.length === 0) {
    throw new Error(`License allowlist at ${path.relative(projectRoot, allowlistPath)} must define a non-empty \"allowedLicenses\" array.`);
  }

  return new Set(parsed.allowedLicenses);
}

function formatLicenseValue(value) {
  if (Array.isArray(value)) {
    return value.map(formatLicenseValue).join(', ');
  }

  return String(value ?? '').trim() || 'UNKNOWN';
}

function evaluateLicenseNode(node, allowedLicenses) {
  if (node.license) {
    const licenseId = `${node.license}${node.plus ? '+' : ''}`;
    const withException = node.exception ? `${licenseId} WITH ${node.exception}` : null;

    if (withException && allowedLicenses.has(withException)) {
      return true;
    }

    if (allowedLicenses.has(licenseId)) {
      return true;
    }

    if (withException && allowedLicenses.has(node.license)) {
      return true;
    }

    return false;
  }

  if (node.conjunction === 'and') {
    return evaluateLicenseNode(node.left, allowedLicenses) && evaluateLicenseNode(node.right, allowedLicenses);
  }

  if (node.conjunction === 'or') {
    return evaluateLicenseNode(node.left, allowedLicenses) || evaluateLicenseNode(node.right, allowedLicenses);
  }

  return false;
}

function isLicenseExpressionAllowed(expression, allowedLicenses) {
  if (typeof expression !== 'string') {
    return false;
  }

  const trimmed = expression.trim();

  if (!trimmed) {
    return false;
  }

  if (allowedLicenses.has(trimmed)) {
    return true;
  }

  const sanitized = trimmed.replace(/\*+$/u, '');
  if (allowedLicenses.has(sanitized)) {
    return true;
  }

  try {
    const ast = parseSpdxExpression(trimmed);
    return evaluateLicenseNode(ast, allowedLicenses);
  } catch (error) {
    const fallbackTokens = sanitized
      .split(/(?:\s+OR\s+|\s+AND\s+|\/|,|;|\||\+)/iu)
      .map((token) => token.replace(/[()]/g, '').trim())
      .filter(Boolean);

    if (fallbackTokens.length === 0) {
      return false;
    }

    if (trimmed.toUpperCase().includes('AND')) {
      return fallbackTokens.every((token) => allowedLicenses.has(token));
    }

    return fallbackTokens.some((token) => allowedLicenses.has(token));
  }
}

function isLicenseAllowed(licenseValue, allowedLicenses) {
  if (Array.isArray(licenseValue)) {
    return licenseValue.every((license) => isLicenseExpressionAllowed(String(license), allowedLicenses));
  }

  return isLicenseExpressionAllowed(String(licenseValue), allowedLicenses);
}

async function generateLicenseReport() {
  const allowedLicenses = await loadAllowlist();
  await mkdir(reportsDir, { recursive: true });

  const packages = await new Promise((resolve, reject) => {
    licenseChecker.init(
      {
        start: projectRoot,
        relativeLicensePath: true
      },
      (error, packagesResult) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(packagesResult);
      }
    );
  });

  const results = [];
  const violations = [];

  for (const [pkgId, info] of Object.entries(packages).sort(([a], [b]) => a.localeCompare(b))) {
    const atIndex = pkgId.lastIndexOf('@');
    const name = atIndex > 0 ? pkgId.slice(0, atIndex) : pkgId;
    const version = atIndex > 0 ? pkgId.slice(atIndex + 1) : null;

    const allowed = isLicenseAllowed(info.licenses, allowedLicenses);

    const entry = {
      id: pkgId,
      name,
      version,
      licenses: info.licenses,
      repository: info.repository ?? null,
      publisher: info.publisher ?? null,
      url: info.url ?? null,
      licenseFile: info.licenseFile ?? null,
      path: info.path ?? null,
      allowed
    };

    results.push(entry);

    if (!allowed) {
      violations.push(entry);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    allowedLicenses: Array.from(allowedLicenses).sort(),
    packageCount: results.length,
    violations: violations.map((pkg) => ({ id: pkg.id, licenses: pkg.licenses })),
    packages: results
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  for (const violation of violations) {
    console.error(`License violation: ${violation.id} (${formatLicenseValue(violation.licenses)})`);
  }

  console.log(`License report written to ${path.relative(projectRoot, reportPath)}`);

  if (violations.length > 0) {
    console.error(`\n${violations.length} package(s) use licenses outside the approved allowlist.`);
    process.exitCode = 1;
  }
}

generateLicenseReport().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
