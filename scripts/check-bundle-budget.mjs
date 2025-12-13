import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PAGE = process.env.BUNDLE_BUDGET_PAGE || '/';
const DEFAULT_BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB) || 1200;

function resolveManifestPath() {
  return path.join(__dirname, '..', '.next', 'build-manifest.json');
}

async function readManifest(manifestPath) {
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

function collectFilesForPage(manifest, page) {
  const files = new Set();
  const add = (entries = []) => {
    entries.forEach((file) => {
      if (typeof file === 'string') files.add(file);
    });
  };

  add(manifest.polyfillFiles);
  add(manifest.rootMainFiles);
  add(manifest.pages?.['/_app']);
  add(manifest.pages?.[page]);

  return Array.from(files);
}

async function calculateTotalSizeBytes(files) {
  let total = 0;
  for (const file of files) {
    const target = path.join(__dirname, '..', '.next', file);
    const stat = await fs.stat(target);
    total += stat.size;
  }
  return total;
}

function formatKb(bytes) {
  return (bytes / 1024).toFixed(1);
}

async function run() {
  const manifestPath = resolveManifestPath();
  const manifest = await readManifest(manifestPath);
  const files = collectFilesForPage(manifest, DEFAULT_PAGE);

  if (!files.length) {
    throw new Error(`No bundle files found for page "${DEFAULT_PAGE}".`);
  }

  const totalBytes = await calculateTotalSizeBytes(files);
  const budgetBytes = DEFAULT_BUDGET_KB * 1024;

  console.log(`Bundle budget target: ${DEFAULT_BUDGET_KB}KB for page ${DEFAULT_PAGE}`);
  console.log(`Bundle files: ${files.length}`);
  console.log(`First load size: ${formatKb(totalBytes)}KB`);

  if (totalBytes > budgetBytes) {
    throw new Error(
      `Bundle budget exceeded: ${formatKb(totalBytes)}KB > ${DEFAULT_BUDGET_KB}KB for page ${DEFAULT_PAGE}.`,
    );
  }
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
