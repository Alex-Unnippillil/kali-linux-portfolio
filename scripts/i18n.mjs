#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fg = require('fast-glob');
const gettextParser = require('gettext-parser');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const DEFAULT_SOURCE_GLOBS = [
  'app/**/*.{js,jsx,ts,tsx}',
  'apps/**/*.{js,jsx,ts,tsx}',
  'components/**/*.{js,jsx,ts,tsx}',
  'hooks/**/*.{js,jsx,ts,tsx}',
  'lib/**/*.{js,jsx,ts,tsx}',
  'modules/**/*.{js,jsx,ts,tsx}',
  'pages/**/*.{js,jsx,ts,tsx}',
  'src/**/*.{js,jsx,ts,tsx}',
  'utils/**/*.{js,jsx,ts,tsx}',
  'workers/**/*.{js,jsx,ts,tsx}'
];

const DEFAULT_IGNORE = [
  'node_modules/**',
  '.next/**',
  '.turbo/**',
  '.vercel/**',
  'coverage/**',
  'dist/**',
  'build/**',
  'public/**'
];

const DEFAULT_FUNCTIONS = ['t'];
const DEFAULT_COMPONENTS = [];

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createFunctionRegex(name) {
  const escaped = escapeRegex(name);
  const pattern =
    "\\b" +
    escaped +
    "\\s*\\(\\s*([\"'`])((?:\\\\.|(?!\\1).)*)\\1(?:\\s*,\\s*([\"'`])((?:\\\\.|(?!\\3).)*)\\3)?";
  return new RegExp(pattern, 'g');
}

function createComponentExtractor(definition) {
  const escapedName = escapeRegex(definition.name);
  const regex = new RegExp(`<${escapedName}\\b([^>]*)>`, 'g');
  const keyPattern =
    escapeRegex(definition.prop) +
    "\\s*=\\s*([\"'`])((?:\\\\.|(?!\\1).)*)\\1";
  const defaultPattern = definition.defaultProp
    ? escapeRegex(definition.defaultProp) + "\\s*=\\s*([\"'`])((?:\\\\.|(?!\\1).)*)\\1"
    : null;
  const keyAttr = new RegExp(keyPattern);
  const defaultAttr = defaultPattern ? new RegExp(defaultPattern) : null;
  return { definition, regex, keyAttr, defaultAttr };
}

function decodeStringLiteral(quote, raw, context, warnings) {
  if (!quote) return null;
  if (quote === '`' && raw.includes('${')) {
    warnings.push({
      file: context.file,
      message: `${context.type} must be a static string literal`,
      snippet: raw.slice(0, 80)
    });
    return null;
  }

  const literal = `${quote}${raw}${quote}`;
  try {
    return new Function(`return ${literal};`)();
  } catch (err) {
    warnings.push({
      file: context.file,
      message: `Could not parse ${context.type}: ${err.message}`,
      snippet: raw.slice(0, 80)
    });
    return null;
  }
}

function addOccurrence(map, key, file, defaultValue) {
  if (!key) return;
  const existing = map.get(key) ?? { key, files: new Set(), defaults: new Set() };
  existing.files.add(file);
  if (typeof defaultValue === 'string' && defaultValue.length > 0) {
    existing.defaults.add(defaultValue);
  }
  map.set(key, existing);
}

async function collectKeys(config) {
  const globs = Array.isArray(config.sourceGlobs) && config.sourceGlobs.length > 0
    ? config.sourceGlobs
    : DEFAULT_SOURCE_GLOBS;

  const ignore = new Set([
    ...DEFAULT_IGNORE,
    `${config.catalogPath ?? 'i18n'}/**`,
    ...(Array.isArray(config.ignoreGlobs) ? config.ignoreGlobs : [])
  ]);

  const files = await fg(globs, {
    cwd: ROOT,
    absolute: true,
    ignore: Array.from(ignore),
    dot: false
  });

  const entries = new Map();
  const warnings = [];
  const functionRegexes = (Array.isArray(config.functions) && config.functions.length > 0
    ? config.functions
    : DEFAULT_FUNCTIONS
  ).map(createFunctionRegex);
  const componentExtractors = (Array.isArray(config.components)
    ? config.components
    : DEFAULT_COMPONENTS
  ).map(createComponentExtractor);

  for (const file of files) {
    const absolute = file;
    const relative = toPosix(path.relative(ROOT, absolute));
    const content = await fs.readFile(absolute, 'utf8');

    for (const regex of functionRegexes) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(content))) {
        const [, quote, rawKey, defaultQuote, rawDefault] = match;
        const key = decodeStringLiteral(quote, rawKey, { file: relative, type: 'translation key' }, warnings);
        if (!key) {
          continue;
        }
        let defaultValue;
        if (defaultQuote) {
          defaultValue = decodeStringLiteral(
            defaultQuote,
            rawDefault,
            { file: relative, type: 'default value' },
            warnings
          );
        }
        addOccurrence(entries, key, relative, defaultValue);
      }
    }

    for (const extractor of componentExtractors) {
      extractor.regex.lastIndex = 0;
      let match;
      while ((match = extractor.regex.exec(content))) {
        const attrs = match[1];
        const keyMatch = extractor.keyAttr.exec(attrs);
        if (!keyMatch) continue;
        const [, keyQuote, keyRaw] = keyMatch;
        const key = decodeStringLiteral(
          keyQuote,
          keyRaw,
          { file: relative, type: `${extractor.definition.name}.${extractor.definition.prop}` },
          warnings
        );
        if (!key) continue;
        let defaultValue;
        if (extractor.defaultAttr) {
          const defaultMatch = extractor.defaultAttr.exec(attrs);
          if (defaultMatch) {
            const [, defaultQuote, defaultRaw] = defaultMatch;
            defaultValue = decodeStringLiteral(
              defaultQuote,
              defaultRaw,
              {
                file: relative,
                type: `${extractor.definition.name}.${extractor.definition.defaultProp}`
              },
              warnings
            );
          }
        }
        addOccurrence(entries, key, relative, defaultValue);
      }
    }
  }

  const conflicts = [];
  for (const entry of entries.values()) {
    if (entry.defaults.size > 1) {
      conflicts.push({ key: entry.key, defaults: Array.from(entry.defaults) });
    }
  }

  return { entries, warnings, conflicts };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readFileIfExists(filePath, encoding) {
  try {
    return await fs.readFile(filePath, encoding);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function createEmptyPo(locale, config) {
  const pluralForms = (config.pluralForms && config.pluralForms[locale]) ||
    (config.pluralForms && config.pluralForms.default) ||
    'nplurals=2; plural=(n != 1);';

  return {
    charset: 'utf-8',
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'plural-forms': pluralForms,
      language: locale
    },
    translations: {
      '': {
        '': {
          msgid: '',
          msgstr: ['']
        }
      }
    }
  };
}

function buildPo(locale, translations, entries, config, existingPo) {
  const pluralForms = (config.pluralForms && config.pluralForms[locale]) ||
    (config.pluralForms && config.pluralForms.default) ||
    'nplurals=2; plural=(n != 1);';

  const po = existingPo ? JSON.parse(JSON.stringify(existingPo)) : createEmptyPo(locale, config);
  po.charset = 'utf-8';
  po.headers = {
    ...po.headers,
    'content-type': 'text/plain; charset=utf-8',
    language: locale,
    'plural-forms': po.headers?.['plural-forms'] || pluralForms
  };

  if (!po.translations) {
    po.translations = { '': {} };
  }
  const existingContext = po.translations[''] || {};
  const headerEntry = existingContext[''] || { msgid: '', msgstr: [''] };
  const nextContext = { '': headerEntry };
  const keys = Object.keys(translations).sort();

  for (const key of keys) {
    const value = translations[key] ?? '';
    const info = entries.get(key);
    const previous = existingContext[key] || {};
    const comments = { ...(previous.comments || {}) };
    const refs = info ? Array.from(info.files).sort() : [];
    if (refs.length > 0) {
      comments.reference = refs.join('\n');
    } else {
      delete comments.reference;
    }
    if (info && info.defaults.size > 0) {
      comments.extracted = Array.from(info.defaults)
        .map((d) => `Default: ${d}`)
        .join('\n');
    } else {
      delete comments.extracted;
    }

    const cleanedComments = Object.keys(comments).length > 0 ? comments : undefined;
    nextContext[key] = {
      msgid: key,
      msgstr: Array.isArray(previous.msgstr) && previous.msgstr.length > 0
        ? [value]
        : [value],
      comments: cleanedComments
    };
  }

  po.translations[''] = nextContext;
  return po;
}

async function processLocale(locale, entries, config, { write }) {
  const catalogDir = path.resolve(ROOT, config.catalogPath || 'i18n');
  const jsonPath = path.join(catalogDir, `${locale}.json`);
  const poPath = path.join(catalogDir, `${locale}.po`);

  const existingJsonText = await readFileIfExists(jsonPath, 'utf8');
  let previousTranslations = {};
  if (existingJsonText) {
    try {
      const parsed = JSON.parse(existingJsonText);
      if (parsed && typeof parsed === 'object') {
        previousTranslations = parsed.translations || parsed.messages || {};
      }
    } catch (err) {
      throw new Error(`Failed to parse ${toPosix(path.relative(ROOT, jsonPath))}: ${err.message}`);
    }
  }

  const sortedKeys = Array.from(entries.keys()).sort();
  const nextTranslations = {};
  const added = [];
  const defaultsApplied = [];
  const previousKeys = new Set(Object.keys(previousTranslations));
  const missing = [];

  for (const key of sortedKeys) {
    let value = previousTranslations[key];
    if (value === undefined) {
      if (locale === config.defaultLocale) {
        const defaults = entries.get(key)?.defaults;
        if (defaults && defaults.size > 0) {
          value = defaults.values().next().value;
          defaultsApplied.push({ key, value });
        } else {
          value = '';
        }
      } else {
        value = '';
      }
      added.push(key);
    }

    if (value === null || value === undefined) {
      value = '';
    } else if (typeof value !== 'string') {
      value = String(value);
    }

    nextTranslations[key] = value;
    if (!value) {
      missing.push(key);
    }
    previousKeys.delete(key);
  }

  const removed = Array.from(previousKeys);

  const jsonPayload = { locale, translations: nextTranslations };
  const jsonString = JSON.stringify(jsonPayload, null, 2) + '\n';
  const jsonDiffers = existingJsonText !== jsonString;

  if (write && jsonDiffers) {
    await fs.mkdir(path.dirname(jsonPath), { recursive: true });
    await fs.writeFile(jsonPath, jsonString, 'utf8');
  }

  const existingPoBuffer = await readFileIfExists(poPath);
  const existingPo = existingPoBuffer ? gettextParser.po.parse(existingPoBuffer) : null;
  const poData = buildPo(locale, nextTranslations, entries, config, existingPo);
  const compiledPo = gettextParser.po.compile(poData);
  const poDiffers = !existingPoBuffer || !compiledPo.equals(existingPoBuffer);

  if (write && poDiffers) {
    await fs.mkdir(path.dirname(poPath), { recursive: true });
    await fs.writeFile(poPath, compiledPo);
  }

  return {
    locale,
    totalKeys: sortedKeys.length,
    added,
    removed,
    missing,
    defaultsApplied,
    jsonPath,
    poPath,
    jsonDiffers,
    poDiffers,
    writtenJson: Boolean(write && jsonDiffers),
    writtenPo: Boolean(write && poDiffers)
  };
}

function printWarnings(warnings) {
  if (!warnings.length) return;
  console.warn('⚠️  Skipped non-static translation values:');
  for (const warning of warnings) {
    const snippet = warning.snippet ? ` — ${warning.snippet}` : '';
    console.warn(`   • ${warning.file}: ${warning.message}${snippet}`);
  }
}

function printConflicts(conflicts) {
  if (!conflicts.length) return;
  console.warn('⚠️  Conflicting default messages detected:');
  for (const conflict of conflicts) {
    console.warn(`   • ${conflict.key}: ${conflict.defaults.join(' | ')}`);
  }
}

function logLocaleResult(result, required) {
  const parts = [
    `${result.locale}: ${result.totalKeys} keys`,
    result.added.length ? `${result.added.length} added` : null,
    result.removed.length ? `${result.removed.length} removed` : null,
    result.missing.length ? `${result.missing.length} missing` : null,
    result.writtenJson || result.writtenPo ? 'catalog updated' : null
  ].filter(Boolean);
  console.log(` - ${parts.join(', ')}`);
  if (result.defaultsApplied.length) {
    console.log(`   defaults applied: ${result.defaultsApplied.map((d) => d.key).join(', ')}`);
  }
  if (result.missing.length) {
    const prefix = required ? '   missing' : '   pending';
    console.log(`${prefix} translations: ${result.missing.join(', ')}`);
  }
  if (result.removed.length) {
    console.log(`   removed keys: ${result.removed.join(', ')}`);
  }
}

async function runSync(config) {
  const { entries, warnings, conflicts } = await collectKeys(config);
  console.log(`Found ${entries.size} translation key${entries.size === 1 ? '' : 's'}.`);
  printWarnings(warnings);
  printConflicts(conflicts);

  const results = [];
  for (const locale of config.locales) {
    const result = await processLocale(locale, entries, config, { write: true });
    const required = config.requiredLocales.includes(locale);
    logLocaleResult(result, required);
    results.push({ ...result, required });
  }

  const outstanding = results.filter((res) => res.required && res.missing.length > 0);
  if (outstanding.length > 0) {
    console.warn('\n⚠️  Missing translations remain for required locales. Fill them in before committing.');
  } else {
    console.log('\n✅ Catalogs synced.');
  }
}

async function runCheck(config) {
  const { entries, warnings, conflicts } = await collectKeys(config);
  printWarnings(warnings);
  printConflicts(conflicts);

  let hasErrors = false;
  const results = [];

  for (const locale of config.locales) {
    const result = await processLocale(locale, entries, config, { write: false });
    const required = config.requiredLocales.includes(locale);
    results.push({ ...result, required });

    if (result.jsonDiffers || result.poDiffers) {
      console.error(`✖ ${locale}: catalogs are out of date. Run "yarn i18n sync".`);
      hasErrors = true;
    }

    if (result.missing.length > 0) {
      const list = result.missing.join(', ');
      if (required) {
        console.error(`✖ ${locale}: missing translations for ${list}`);
        hasErrors = true;
      } else {
        console.warn(`⚠️  ${locale}: missing translations for ${list}`);
      }
    }
  }

  if (results.every((res) => !res.jsonDiffers && !res.poDiffers && res.missing.length === 0)) {
    console.log('✅ i18n catalogs are up to date.');
  }

  if (hasErrors) {
    process.exit(1);
  }
}

async function loadConfig() {
  const configPath = path.join(ROOT, 'i18n', 'config.json');
  let raw = {};
  try {
    const text = await fs.readFile(configPath, 'utf8');
    raw = JSON.parse(text);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Missing i18n config at ${toPosix(path.relative(ROOT, configPath))}`);
    }
    throw err;
  }

  const locales = ensureArray(raw.locales).length > 0 ? ensureArray(raw.locales) : ['en'];
  const defaultLocale = raw.defaultLocale && locales.includes(raw.defaultLocale)
    ? raw.defaultLocale
    : locales[0];
  const requiredLocales = ensureArray(raw.requiredLocales).length > 0
    ? ensureArray(raw.requiredLocales)
    : [defaultLocale];

  return {
    catalogPath: raw.catalogPath || 'i18n',
    sourceGlobs: ensureArray(raw.sourceGlobs).length > 0 ? raw.sourceGlobs : DEFAULT_SOURCE_GLOBS,
    ignoreGlobs: ensureArray(raw.ignoreGlobs),
    functions: ensureArray(raw.functions).length > 0 ? raw.functions : DEFAULT_FUNCTIONS,
    components: ensureArray(raw.components),
    locales,
    defaultLocale,
    requiredLocales: requiredLocales.filter((locale) => locales.includes(locale)),
    pluralForms: raw.pluralForms || {},
    configPath
  };
}

function printHelp() {
  console.log(`Usage: yarn i18n <command>\n\nCommands:\n  sync   Scan source files and update translation catalogs.\n  check  Validate that catalogs are up to date (used in CI).\n`);
}

async function main() {
  const [, , command] = process.argv;
  const config = await loadConfig();

  if (!config.locales.includes(config.defaultLocale)) {
    throw new Error(`Default locale ${config.defaultLocale} is not listed in locales array.`);
  }

  const normalizedRequired = config.requiredLocales.filter((locale) => config.locales.includes(locale));
  if (normalizedRequired.length !== config.requiredLocales.length) {
    console.warn('⚠️  Some required locales were not present in locales list and were ignored.');
    config.requiredLocales = normalizedRequired;
  }

  switch ((command || '').toLowerCase()) {
    case 'sync':
      await runSync(config);
      break;
    case 'check':
      await runCheck(config);
      break;
    case '':
    case 'help':
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
