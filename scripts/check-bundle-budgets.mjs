import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const budgetsPath = path.join(rootDir, 'bundle-budgets.json');
const manifestPath = path.join(rootDir, '.next', 'build-manifest.json');

if (!existsSync(manifestPath)) {
  console.error(`Missing build manifest at ${manifestPath}. Run "yarn build" first.`);
  process.exit(1);
}

if (!existsSync(budgetsPath)) {
  console.error(`Missing bundle budgets config at ${budgetsPath}.`);
  process.exit(1);
}

const budgetsRaw = await readFile(budgetsPath, 'utf8');
const manifestRaw = await readFile(manifestPath, 'utf8');

const budgets = JSON.parse(budgetsRaw);
const manifest = JSON.parse(manifestRaw);
const defaultLimit = Number.isFinite(budgets.defaultMaxSizeKb)
  ? budgets.defaultMaxSizeKb
  : Infinity;
const overrides = budgets.overrides ?? {};

const results = [];
let hasFailure = false;

for (const [page, files] of Object.entries(manifest.pages ?? {})) {
  if (!Array.isArray(files)) {
    continue;
  }

  if (page.startsWith('/api')) {
    continue;
  }

  let totalBytes = 0;
  for (const file of files) {
    if (!file.endsWith('.js')) {
      continue;
    }
    const filePath = path.join(rootDir, '.next', file);
    const info = await stat(filePath);
    totalBytes += info.size;
  }

  const sizeKb = totalBytes / 1024;
  const limit = overrides[page] ?? defaultLimit;
  const passes = sizeKb <= limit;

  results.push({
    page,
    sizeKb: Number(sizeKb.toFixed(1)),
    limitKb: Number.isFinite(limit) ? limit : null,
    status: passes ? 'pass' : 'fail',
  });

  if (!passes) {
    hasFailure = true;
  }
}

results.sort((a, b) => b.sizeKb - a.sizeKb);

for (const { page, sizeKb, limitKb, status } of results) {
  const label = status.toUpperCase().padEnd(4);
  const limitLabel = limitKb ? `${limitKb}kb` : 'no limit';
  console.log(`${label} ${page} - ${sizeKb}kb (limit ${limitLabel})`);
}

const reportDir = path.join(rootDir, 'reports');
await mkdir(reportDir, { recursive: true });
await writeFile(
  path.join(reportDir, 'bundle-budgets.json'),
  JSON.stringify(results, null, 2),
  'utf8',
);

if (hasFailure) {
  console.error('Bundle budgets exceeded. See reports/bundle-budgets.json for details.');
  process.exit(1);
}

console.log('Bundle budgets passed.');
