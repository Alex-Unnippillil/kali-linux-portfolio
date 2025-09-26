import fg from 'fast-glob';
import { readFile } from 'fs/promises';
import path from 'path';

const PATTERNS = [
  {
    name: 'AWS Access Key ID',
    regex: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA)[0-9A-Z]{16}\b/g,
  },
  {
    name: 'AWS Secret Access Key',
    regex: /(?:aws_?)?secret(?:_access)?_key\s*[=:\"']\s*[A-Za-z0-9\/+=]{40}/gi,
  },
  {
    name: 'Google API Key',
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
  },
  {
    name: 'Stripe Secret Key',
    regex: /\bsk_(?:live|test)_[0-9a-zA-Z]{24,}\b/g,
  },
  {
    name: 'OpenAI API Key',
    regex: /\bsk-[A-Za-z0-9]{32,}\b/g,
  },
  {
    name: 'GitHub Token',
    regex: /\bgh[pousr]_[A-Za-z0-9]{36}\b/g,
  },
  {
    name: 'Slack Token',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,48}\b/g,
  },
  {
    name: 'Twilio API Key',
    regex: /\bSK[0-9a-fA-F]{32}\b/g,
  },
];

const DEFAULT_IGNORE = [
  '.git/**',
  '.next/**',
  '.turbo/**',
  '.yarn/**',
  'coverage/**',
  'dist/**',
  'node_modules/**',
  'out/**',
  'playwright-report/**',
  'public/sw.js',
  'tmp/**',
  'yarn.lock',
];

const EXACT_IGNORE = new Set(
  DEFAULT_IGNORE.filter((pattern) => !/[\*\[\?]/.test(pattern)).map((pattern) => pattern.replace(/\\/g, '/')),
);

const toPosix = (value) => value.split(path.sep).join('/');

const BINARY_EXTENSIONS = new Set([
  '.7z',
  '.avi',
  '.avif',
  '.bmp',
  '.db',
  '.dll',
  '.exe',
  '.gif',
  '.gz',
  '.ico',
  '.jar',
  '.jpeg',
  '.jpg',
  '.mp3',
  '.mp4',
  '.otf',
  '.pdf',
  '.png',
  '.psd',
  '.svgz',
  '.tar',
  '.tif',
  '.tiff',
  '.ttf',
  '.webm',
  '.webp',
  '.wmv',
  '.woff',
  '.woff2',
  '.zip',
]);

const hasBinaryExtension = (file) => BINARY_EXTENSIONS.has(path.extname(file).toLowerCase());

const isBinary = (buffer) => {
  const len = Math.min(buffer.length, 1024);
  for (let i = 0; i < len; i += 1) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
};

const getTargets = async (args) => {
  if (args.length > 0) {
    return [...new Set(args.filter(Boolean))];
  }

  const entries = await fg(['**/*'], {
    cwd: process.cwd(),
    onlyFiles: true,
    dot: true,
    ignore: DEFAULT_IGNORE,
  });
  return entries.map(toPosix);
};

const collectMatches = (text, pattern) => {
  const matches = [];
  const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

  let match;
  while ((match = regex.exec(text)) !== null) {
    const index = match.index ?? 0;
    const line = text.slice(0, index).split('\n').length;
    const column = index - text.lastIndexOf('\n', index - 1);
    const value = match[0];

    matches.push({
      line,
      column,
      value,
    });
  }

  return matches;
};

const scanFile = async (file, patterns) => {
  try {
    const buffer = await readFile(file);
    if (isBinary(buffer)) {
      return [];
    }

    const text = buffer.toString('utf8');
    const findings = [];

    for (const pattern of patterns) {
      const matches = collectMatches(text, pattern);
      for (const match of matches) {
        findings.push({
          ...match,
          pattern: pattern.name,
        });
      }
    }

    return findings;
  } catch (error) {
    if (error.code === 'EISDIR') {
      return [];
    }

    console.warn(`⚠️  Could not read ${file}: ${error.message}`);
    return [];
  }
};

const formatFinding = (file, finding) =>
  `${file}:${finding.line}:${finding.column} — ${finding.pattern} → ${finding.value}`;

const main = async () => {
  const root = process.cwd();
  const args = process.argv.slice(2).map((arg) => {
    const absolute = path.isAbsolute(arg) ? arg : path.join(root, arg);
    return toPosix(path.relative(root, absolute));
  });
  const targets = await getTargets(args);

  if (targets.length === 0) {
    console.log('No files to scan.');
    return;
  }

  const allFindings = [];

  for (const rawFile of targets) {
    const absolute = path.isAbsolute(rawFile) ? rawFile : path.join(root, rawFile);
    const relative = toPosix(path.relative(root, absolute));

    if (EXACT_IGNORE.has(relative)) {
      continue;
    }

    if (hasBinaryExtension(absolute)) {
      continue;
    }

    const findings = await scanFile(absolute, PATTERNS);
    if (findings.length > 0) {
      for (const finding of findings) {
        allFindings.push({ file: relative, ...finding });
      }
    }
  }

  if (allFindings.length > 0) {
    console.error('🚨 Potential secrets detected:');
    for (const finding of allFindings) {
      console.error(`  - ${formatFinding(finding.file, finding)}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('✅ No secrets detected.');
};

main().catch((error) => {
  console.error('check-secrets failed with an unexpected error.');
  console.error(error);
  process.exit(1);
});

