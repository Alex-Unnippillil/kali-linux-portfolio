import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'public', 'manifest.webmanifest');
const DATASET_PATH = path.join(ROOT, 'data', 'pwa-shortcuts.json');
const MAX_SHORTCUTS = 4;

const computeIntegrity = (entry) => {
  const raw = `${entry.url}|${entry.name}|${entry.short_name ?? entry.name}`;
  const digest = createHash('sha256').update(raw, 'utf8').digest('base64');
  return `sha256-${digest}`;
};

const toManifestShortcut = (definition) => {
  const manifestEntry = {
    name: definition.name,
    short_name: definition.shortName ?? definition.name,
    url: definition.url,
    description: definition.description,
    icons: definition.icons,
  };
  return {
    ...manifestEntry,
    integrity: computeIntegrity(manifestEntry),
  };
};

const normalizeDefinition = (definition) => ({
  ...definition,
  mruScore: typeof definition.mruScore === 'number' ? definition.mruScore : 0,
  defaultPinned: Boolean(definition.defaultPinned),
});

async function main() {
  let manifestRaw;
  let datasetRaw;

  try {
    [manifestRaw, datasetRaw] = await Promise.all([
      readFile(MANIFEST_PATH, 'utf8'),
      readFile(DATASET_PATH, 'utf8'),
    ]);
  } catch (error) {
    console.error('[manifest-shortcuts] Failed to read source files', error);
    process.exitCode = 1;
    return;
  }

  let manifest;
  let dataset;
  try {
    manifest = JSON.parse(manifestRaw);
    dataset = JSON.parse(datasetRaw).map(normalizeDefinition);
  } catch (error) {
    console.error('[manifest-shortcuts] Failed to parse JSON', error);
    process.exitCode = 1;
    return;
  }

  const topShortcuts = dataset
    .filter((entry) => entry && !entry.disabled)
    .sort((a, b) => {
      if (a.defaultPinned !== b.defaultPinned) {
        return a.defaultPinned ? -1 : 1;
      }
      return b.mruScore - a.mruScore;
    })
    .slice(0, MAX_SHORTCUTS)
    .map(toManifestShortcut);

  const nextManifest = {
    ...manifest,
    shortcuts: topShortcuts,
  };

  try {
    await writeFile(MANIFEST_PATH, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');
    console.log(`[manifest-shortcuts] Updated ${MANIFEST_PATH} with ${topShortcuts.length} shortcuts.`);
  } catch (error) {
    console.error('[manifest-shortcuts] Failed to write manifest', error);
    process.exitCode = 1;
  }
}

await main();
