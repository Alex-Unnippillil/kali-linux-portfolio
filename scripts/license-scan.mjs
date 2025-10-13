#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fg from 'fast-glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultConfigPath = path.join(__dirname, 'license-allowlist.json');
const configArg = process.argv[2];
const configPath = path.resolve(process.cwd(), configArg ?? defaultConfigPath);

const readJson = async (file) => {
  const content = await fs.readFile(file, 'utf8');
  return JSON.parse(content);
};

const loadConfig = async () => {
  try {
    const config = await readJson(configPath);
    if (!Array.isArray(config.allowed) || config.allowed.length === 0) {
      throw new Error('Config must expose a non-empty "allowed" array.');
    }
    return config;
  } catch (error) {
    console.error(`Failed to read license allowlist at ${configPath}:`, error.message);
    process.exit(1);
  }
};

const normalizeToken = (token) => token.trim().toUpperCase();

const IGNORED_LICENSE_TOKENS = new Set([
  'AND',
  'OR',
  'WITH',
  'FILE',
  'SEE',
  'THE',
  'IN',
  'FEEL',
  'FREE',
  'MD',
  'LICENSE',
]);

const parseLicenseTokens = (licenseValue) => {
  if (!licenseValue) {
    return [];
  }

  if (Array.isArray(licenseValue)) {
    const tokens = [];
    for (const entry of licenseValue) {
      tokens.push(...parseLicenseTokens(entry));
    }
    return tokens;
  }

  if (typeof licenseValue === 'object') {
    if (licenseValue.type) {
      return parseLicenseTokens(licenseValue.type);
    }
    if (licenseValue.license) {
      return parseLicenseTokens(licenseValue.license);
    }
    if (licenseValue.name) {
      return parseLicenseTokens(licenseValue.name);
    }
    return [];
  }

  if (typeof licenseValue === 'string') {
    const cleaned = licenseValue.replace(/[^A-Za-z0-9.\-+/ ]+/g, ' ');
    const rawTokens = cleaned.match(/[A-Za-z0-9.\-+/]+/g) ?? [];
    return rawTokens
      .map(normalizeToken)
      .filter((token) => {
        if (token.length === 0) {
          return false;
        }
        if (IGNORED_LICENSE_TOKENS.has(token)) {
          return false;
        }
        if (/\.(MD|TXT)$/u.test(token)) {
          return false;
        }
        if (token.includes('FEEL-FREE')) {
          return false;
        }
        return true;
      });
  }

  return [];
};

const uniq = (values) => Array.from(new Set(values));

const resolveLicenseTokens = (pkg) => {
  if (pkg.license) {
    return uniq(parseLicenseTokens(pkg.license));
  }
  if (pkg.licenses) {
    return uniq(parseLicenseTokens(pkg.licenses));
  }
  return [];
};

const formatList = (values) => (values.length ? values.join(', ') : 'None');

const renderViolationMessage = (violation) => {
  const base = `${violation.identifier} → ${formatList(violation.licenses)}`;
  if (violation.reason === 'missing') {
    return `${base} (no license metadata)`;
  }
  if (violation.reason === 'not-allowed') {
    return `${base} (not in allowlist)`;
  }
  return base;
};

const isException = (exceptions, identifier, name) => {
  const lowered = identifier.toLowerCase();
  const loweredName = name.toLowerCase();
  return exceptions.has(lowered) || exceptions.has(loweredName);
};

const lookupAlias = (aliases, token) => {
  const direct = aliases.get(token);
  if (direct) {
    return direct;
  }
  if (token.endsWith('+')) {
    return aliases.get(token.slice(0, -1));
  }
  return undefined;
};

const buildTokenChecker = (allowed, aliases) => {
  const allowedSet = new Set(allowed.map((token) => normalizeToken(token)));
  const aliasMap = new Map(
    Object.entries(aliases ?? {}).map(([key, value]) => [normalizeToken(key), normalizeToken(value)]),
  );

  return (token) => {
    if (allowedSet.has(token)) {
      return true;
    }
    if (token.endsWith('+') && allowedSet.has(token.slice(0, -1))) {
      return true;
    }
    const alias = lookupAlias(aliasMap, token);
    if (alias && allowedSet.has(alias)) {
      return true;
    }
    if (alias && aliasMap.has(alias)) {
      return allowedSet.has(aliasMap.get(alias));
    }
    return false;
  };
};

const scanLicenses = async () => {
  const config = await loadConfig();
  const checkToken = buildTokenChecker(config.allowed, config.aliases);
  const exceptions = new Set((config.exceptions ?? []).map((value) => value.toLowerCase()));
  const allowUnlicensed = Boolean(config.allowUnlicensed);

  const packageJsonPaths = await fg(['node_modules/**/package.json'], {
    ignore: ['**/node_modules/.bin/**'],
    absolute: true,
    followSymbolicLinks: false,
  });

  if (packageJsonPaths.length === 0) {
    console.warn('No package manifests found under node_modules. Did you run `yarn install`?');
    return 0;
  }

  const seen = new Set();
  const violations = [];
  let total = 0;

  const compiledNextSegment = `${path.sep}next${path.sep}dist${path.sep}`;
  const parentCache = new Map();

  for (const pkgPath of packageJsonPaths) {
    let pkg;
    try {
      pkg = await readJson(pkgPath);
    } catch {
      continue;
    }

    if (!pkg?.name || pkg.private) {
      continue;
    }

    if (pkgPath.includes(compiledNextSegment)) {
      continue;
    }

    if (pkgPath.includes(`${path.sep}test${path.sep}`) || pkgPath.includes(`${path.sep}tests${path.sep}`)) {
      continue;
    }

    const parentPkgPath = path.resolve(pkgPath, '..', '..', 'package.json');
    if (!parentCache.has(parentPkgPath)) {
      try {
        parentCache.set(parentPkgPath, await readJson(parentPkgPath));
      } catch {
        parentCache.set(parentPkgPath, null);
      }
    }

    const parentPkg = parentCache.get(parentPkgPath);
    if (parentPkg?.name && pkg.name.startsWith(`${parentPkg.name}/`)) {
      continue;
    }

    const identifier = `${pkg.name}@${pkg.version ?? '0.0.0'}`;
    if (seen.has(identifier)) {
      continue;
    }
    seen.add(identifier);

    total += 1;

    if (pkg.version === '0.0.0') {
      continue;
    }

    if (isException(exceptions, identifier, pkg.name)) {
      continue;
    }

    const tokens = resolveLicenseTokens(pkg);

    if (tokens.length === 0) {
      if (!allowUnlicensed) {
        violations.push({
          identifier,
          licenses: [],
          reason: 'missing',
        });
      }
      continue;
    }

    const disallowed = tokens.filter((token) => !checkToken(token));
    if (disallowed.length > 0) {
      violations.push({
        identifier,
        licenses: disallowed,
        reason: 'not-allowed',
      });
    }
  }

  if (violations.length === 0) {
    console.log(`✅ License scan passed for ${total} packages.`);
    return 0;
  }

  console.error('❌ License allowlist violations detected:');
  for (const violation of violations.sort((a, b) => a.identifier.localeCompare(b.identifier))) {
    console.error(`  - ${renderViolationMessage(violation)}`);
  }

  return violations.length;
};

const main = async () => {
  const violations = await scanLicenses();
  if (violations > 0) {
    process.exitCode = 1;
  }
};

main();
