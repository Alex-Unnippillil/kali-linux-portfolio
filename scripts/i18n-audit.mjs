#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';

const ROOT_NAMESPACE = '__root__';

const args = process.argv.slice(2);
const options = {
  dirs: new Set(),
  baseLocale: process.env.I18N_AUDIT_BASE_LOCALE || 'en',
  strict: process.env.CI === 'true',
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--dir' || arg === '-d') {
    const next = args[i + 1];
    if (!next) {
      console.error('Expected a directory after --dir');
      process.exit(2);
    }
    options.dirs.add(next);
    i += 1;
    continue;
  }
  if (arg.startsWith('--dir=')) {
    options.dirs.add(arg.slice('--dir='.length));
    continue;
  }
  if (arg === '--base' || arg === '-b') {
    const next = args[i + 1];
    if (!next) {
      console.error('Expected a locale after --base');
      process.exit(2);
    }
    options.baseLocale = next;
    i += 1;
    continue;
  }
  if (arg.startsWith('--base=')) {
    options.baseLocale = arg.slice('--base='.length);
    continue;
  }
  if (arg === '--strict') {
    options.strict = true;
    continue;
  }
}

const cwd = process.cwd();
const candidateDirs = Array.from(options.dirs.size > 0
  ? options.dirs
  : [path.join(cwd, 'locales'), path.join(cwd, 'public', 'locales')]);

const existingDirs = await Promise.all(
  candidateDirs.map(async (dir) => {
    try {
      const stat = await fs.stat(dir);
      return stat.isDirectory() ? dir : null;
    } catch {
      return null;
    }
  }),
);

const localeDirs = existingDirs.filter(Boolean);

if (localeDirs.length === 0) {
  console.warn('[i18n-audit] No locale directories found. Checked:', candidateDirs.join(', '));
  process.exit(0);
}

const localeMaps = new Map();

const flattenKeys = (obj, prefix = '') => {
  const keys = new Set();
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) keys.add(prefix);
    return keys;
  }
  Object.entries(obj).forEach(([key, value]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenKeys(value, nextPrefix);
      nested.forEach((nestedKey) => keys.add(nestedKey));
    } else {
      keys.add(nextPrefix);
    }
  });
  return keys;
};

const readJsonFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${error.message}`);
  }
};

for (const dir of localeDirs) {
  const files = await fg('**/*.json', { cwd: dir, absolute: true });
  for (const file of files) {
    const relative = path.relative(dir, file);
    const segments = relative.split(path.sep).filter(Boolean);
    if (segments.length === 0) continue;

    let locale;
    let namespace;

    if (segments.length === 1 && segments[0].endsWith('.json')) {
      locale = segments[0].slice(0, -5);
      namespace = ROOT_NAMESPACE;
    } else {
      const [localeSegment, ...rest] = segments;
      locale = localeSegment ?? '';
      if (!locale || rest.length === 0) continue;
      const fileName = rest.pop();
      if (!fileName || !fileName.endsWith('.json')) continue;
      const baseName = fileName.slice(0, -5);
      namespace = rest.length > 0 ? [...rest, baseName].join('/') : baseName || ROOT_NAMESPACE;
    }

    const data = await readJsonFile(file);
    const keys = flattenKeys(data);
    if (!localeMaps.has(locale)) {
      localeMaps.set(locale, new Map());
    }
    const localeEntry = localeMaps.get(locale);
    const existing = localeEntry.get(namespace) ?? new Set();
    keys.forEach((key) => existing.add(key));
    localeEntry.set(namespace, existing);
  }
}

if (localeMaps.size === 0) {
  console.warn('[i18n-audit] No locale JSON files found inside directories:', localeDirs.join(', '));
  process.exit(0);
}

const availableLocales = Array.from(localeMaps.keys()).sort();
let baseLocale = options.baseLocale;
if (!localeMaps.has(baseLocale)) {
  const fallbackBase = availableLocales[0];
  console.warn(
    `[i18n-audit] Base locale "${baseLocale}" not found. Using "${fallbackBase}" as reference.`,
  );
  baseLocale = fallbackBase;
}

const baseNamespaces = localeMaps.get(baseLocale);
if (!baseNamespaces) {
  console.error(`[i18n-audit] Unable to resolve namespaces for base locale "${baseLocale}".`);
  process.exit(options.strict ? 1 : 0);
}
const issues = [];

const compareKeys = (reference, candidate, locale, namespace) => {
  const missing = [];
  const extra = [];
  reference.forEach((key) => {
    if (!candidate?.has(key)) {
      missing.push(key);
    }
  });
  if (candidate) {
    candidate.forEach((key) => {
      if (!reference.has(key)) {
        extra.push(key);
      }
    });
  }
  if (missing.length > 0) {
    issues.push({
      type: 'missing',
      locale,
      namespace,
      keys: missing,
    });
  }
  if (extra.length > 0) {
    issues.push({
      type: 'stale',
      locale,
      namespace,
      keys: extra,
    });
  }
};

for (const [locale, namespaces] of localeMaps.entries()) {
  if (locale === baseLocale) continue;
  for (const [namespace, referenceKeys] of baseNamespaces.entries()) {
    const targetKeys = namespaces.get(namespace);
    compareKeys(referenceKeys, targetKeys, locale, namespace);
  }
  for (const namespace of namespaces.keys()) {
    if (!baseNamespaces.has(namespace)) {
      issues.push({
        type: 'stale',
        locale,
        namespace,
        keys: Array.from(namespaces.get(namespace)),
      });
    }
  }
}

if (issues.length === 0) {
  console.log(
    `[i18n-audit] ✓ ${availableLocales.length} locale(s) with ${baseNamespaces.size} namespace(s) verified against base "${baseLocale}".`,
  );
  process.exit(0);
}

const summarizeKeys = (keys) => {
  if (keys.length <= 5) return keys.join(', ');
  const preview = keys.slice(0, 5).join(', ');
  return `${preview}, … (+${keys.length - 5} more)`;
};

console.warn('[i18n-audit] Detected translation discrepancies:');
for (const issue of issues) {
  const label = issue.type === 'missing' ? 'Missing' : 'Stale';
  console.warn(
    `  • ${label} keys in locale "${issue.locale}" namespace "${issue.namespace}": ${summarizeKeys(issue.keys)}`,
  );
}

if (options.strict) {
  console.error(
    `[i18n-audit] Found ${issues.length} issue(s). Failing due to strict mode (CI or --strict).`,
  );
  process.exit(1);
}

process.exit(0);
