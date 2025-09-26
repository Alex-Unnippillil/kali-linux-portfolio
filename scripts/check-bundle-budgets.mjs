import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const BUILD_DIR = path.join(ROOT_DIR, '.next', 'static', 'chunks', 'pages');
const BUDGETS_PATH = path.join(ROOT_DIR, 'data', 'bundle-budgets.json');
const REGRESSION_THRESHOLD = 0.1; // 10%

const formatBytes = (bytes) => `${bytes.toLocaleString()} B`;

const loadBudgets = async () => {
  try {
    const raw = await fs.readFile(BUDGETS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    throw new Error('Bundle budgets file must contain an object mapping route names to byte sizes.');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Bundle budgets file not found at ${BUDGETS_PATH}.`);
    }
    throw err;
  }
};

const parseRouteName = (fileName) => {
  const hashMatch = fileName.match(/^(.*?)-([0-9a-f]{16,})\.js$/i);
  if (hashMatch) {
    return hashMatch[1];
  }
  return fileName.replace(/\.js$/, '');
};

const getCurrentBundles = async () => {
  let entries;
  try {
    entries = await fs.readdir(BUILD_DIR);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('Build artifacts not found. Run `yarn build` before checking bundle budgets.');
    }
    throw err;
  }

  const bundles = new Map();
  for (const entry of entries) {
    if (!entry.endsWith('.js')) continue;
    const route = parseRouteName(entry);
    const stat = await fs.stat(path.join(BUILD_DIR, entry));
    bundles.set(route, stat.size);
  }
  return bundles;
};

const main = async () => {
  const budgets = await loadBudgets();
  const currentBundles = await getCurrentBundles();

  const missingRoutes = [];
  const regressions = [];
  const summaries = [];

  for (const [route, baseline] of Object.entries(budgets)) {
    if (!currentBundles.has(route)) {
      missingRoutes.push(route);
      continue;
    }

    const currentSize = currentBundles.get(route);
    const delta = currentSize - baseline;
    const change = baseline === 0 ? (delta === 0 ? 0 : Infinity) : delta / baseline;

    const status = change > REGRESSION_THRESHOLD ? '▲' : change < 0 ? '▼' : '•';
    summaries.push(
      `${status} ${route}: ${formatBytes(baseline)} → ${formatBytes(currentSize)} (${change === Infinity ? '∞' : (change * 100).toFixed(2)}%)`
    );

    if (change > REGRESSION_THRESHOLD) {
      regressions.push({ route, baseline, currentSize, change });
    }
  }

  const newRoutes = [];
  for (const [route, size] of currentBundles.entries()) {
    if (!(route in budgets)) {
      newRoutes.push({ route, size });
    }
  }

  summaries.forEach((line) => console.log(line));

  if (missingRoutes.length > 0) {
    console.error('\nMissing bundle baselines for routes:', missingRoutes.join(', '));
  }

  if (newRoutes.length > 0) {
    console.error('\nNew bundle outputs detected. Update data/bundle-budgets.json with:',
      newRoutes.map((r) => `${r.route}: ${r.size}`).join(', '));
  }

  if (regressions.length > 0) {
    console.error('\nBundle size regressions above 10% detected:');
    for (const reg of regressions) {
      const pct = (reg.change * 100).toFixed(2);
      console.error(` - ${reg.route}: ${formatBytes(reg.baseline)} → ${formatBytes(reg.currentSize)} (+${pct}%)`);
    }
  }

  if (missingRoutes.length > 0 || newRoutes.length > 0 || regressions.length > 0) {
    process.exit(1);
  }

  console.log('\nBundle budgets check passed.');
};

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
