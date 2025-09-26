#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'apps.config.js');
const SEARCH_DIRS = [
  path.join(rootDir, 'components', 'apps'),
  path.join(rootDir, 'apps'),
];

const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];

async function ensureConfigReadable() {
  try {
    await fs.access(configPath);
  } catch (error) {
    console.error(`Unable to access apps.config.js at ${configPath}`);
    console.error(error);
    process.exit(1);
  }
}

async function readDynamicAppIds() {
  const source = await fs.readFile(configPath, 'utf8');
  const regex = /createDynamicApp\(\s*['"]([^'"\)]+)['"]/g;
  const ids = new Set();
  let match;
  while ((match = regex.exec(source)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

async function pathExists(candidate) {
  try {
    const stats = await fs.stat(candidate);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}

async function resolveDynamicImport(id) {
  const extInId = path.extname(id);

  for (const root of SEARCH_DIRS) {
    const basePath = path.join(root, id);
    const candidates = new Set();

    if (extInId) {
      candidates.add(basePath);
    } else {
      for (const ext of EXTENSIONS) {
        candidates.add(basePath + ext);
      }
      candidates.add(basePath);
      const indexBase = path.join(basePath, 'index');
      for (const ext of EXTENSIONS) {
        candidates.add(indexBase + ext);
      }
    }

    for (const candidate of candidates) {
      if (await pathExists(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

async function main() {
  await ensureConfigReadable();
  const ids = await readDynamicAppIds();

  if (ids.size === 0) {
    console.warn('No dynamic applications were discovered in apps.config.js');
    return;
  }

  const missing = [];
  for (const id of ids) {
    const resolved = await resolveDynamicImport(id);
    if (!resolved) {
      missing.push(id);
    }
  }

  if (missing.length > 0) {
    console.error('The following dynamic app modules could not be resolved:');
    for (const id of missing) {
      console.error(`  • ${id}`);
    }
    process.exit(1);
  }

  console.log(`Validated ${ids.size} dynamic app modules.`);
}

main().catch((error) => {
  console.error('Unexpected error while validating app modules:');
  console.error(error);
  process.exit(1);
});
