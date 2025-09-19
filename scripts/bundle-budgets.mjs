#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const INITIAL_BUDGET_KB = 180;
const ROUTE_BUDGET_KB = 60;
const KB = 1024;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

const args = new Set(process.argv.slice(2));
const shouldCheck = args.has('--check');
const skipBuild = args.has('--skip-build');
const analyzeDir = path.join(repoRoot, '.next', 'analyze');
const statsPath = path.join(analyzeDir, 'client.json');
const filesToRestore = ['tsconfig.json', 'next-env.d.ts', 'public/sw.js'];

function formatKb(bytes) {
  return (bytes / KB).toFixed(1);
}

function entryToRoute(entry) {
  if (!entry.startsWith('pages/')) return null;
  if (entry === 'pages/_app' || entry === 'pages/_document') return null;
  if (entry.startsWith('pages/api/')) return null;

  const page = entry.slice('pages/'.length);
  if (page === 'index' || page === '') return '/';
  let route = `/${page}`;
  route = route.replace(/\/index$/, '/');
  if (route.length > 1 && route.endsWith('/')) {
    route = route.slice(0, -1);
  }
  return route;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function getAssetsForEntry(stats, entry) {
  return stats.filter(
    (asset) =>
      asset.isAsset &&
      asset.isInitialByEntrypoint?.[entry] &&
      typeof asset.label === 'string' &&
      asset.label.endsWith('.js'),
  );
}

function describeHeaviestChunk(assets) {
  if (!assets.length) return null;
  const heaviest = assets.reduce((max, asset) => (asset.gzipSize > (max?.gzipSize ?? 0) ? asset : max), null);
  if (!heaviest) return null;
  const moduleLabel = heaviest.groups?.[0]?.label;
  return {
    file: heaviest.label,
    kb: formatKb(heaviest.gzipSize || 0),
    module: moduleLabel,
  };
}

async function runBuild() {
  if (skipBuild) {
    console.log('Skipping build step (--skip-build supplied).');
    return;
  }

  await fs.rm(analyzeDir, { recursive: true, force: true });

  const preserved = await Promise.all(
    filesToRestore.map(async (relative) => {
      const fullPath = path.join(repoRoot, relative);
      try {
        const contents = await fs.readFile(fullPath, 'utf8');
        return { relative, contents };
      } catch {
        return null;
      }
    }),
  );

  console.log('Building with @next/bundle-analyzer (gzip report)…');

  try {
    await new Promise((resolve, reject) => {
      const child = spawn('yarn', ['build'], {
        cwd: repoRoot,
        env: { ...process.env, ANALYZE: 'json' },
        stdio: 'inherit',
      });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yarn build exited with code ${code}`));
        }
      });
    });
  } finally {
    await Promise.all(
      preserved
        .filter(Boolean)
        .map(async ({ relative, contents }) => {
          const fullPath = path.join(repoRoot, relative);
          try {
            await fs.writeFile(fullPath, contents, 'utf8');
          } catch (err) {
            console.warn(`Unable to restore ${relative}: ${err.message}`);
          }
        }),
    );
  }
}

function collectEntries(stats) {
  const entries = new Set();
  for (const asset of stats) {
    const entrypoints = asset.isInitialByEntrypoint ? Object.keys(asset.isInitialByEntrypoint) : [];
    for (const name of entrypoints) {
      entries.add(name);
    }
  }
  return entries;
}

function formatTable(routes, budgetBytes) {
  return routes.map(({ route, size }) => ({
    route,
    'gzip kB': formatKb(size),
    status: size > budgetBytes ? 'OVER' : 'ok',
  }));
}

function emitAnnotation(message) {
  console.error(message);
  if (process.env.GITHUB_ACTIONS) {
    const cleaned = message.replace(/[\r\n]+/g, ' ').trim();
    console.log(`::error ::${cleaned}`);
  }
}

async function main() {
  await runBuild();

  try {
    await fs.access(statsPath);
  } catch {
    throw new Error('Bundle analyzer stats not found. Ensure the build completed successfully.');
  }

  const stats = await readJson(statsPath);
  const entrySet = collectEntries(stats);
  const sharedEntries = ['main', 'pages/_app'];

  const sharedAssets = sharedEntries.flatMap((entry) => getAssetsForEntry(stats, entry));
  const sharedBytes = sharedAssets.reduce((sum, asset) => sum + (asset.gzipSize || 0), 0);
  const sharedHotspot = describeHeaviestChunk(sharedAssets);

  const routes = Array.from(entrySet)
    .filter((entry) => entry.startsWith('pages/') && entry !== 'pages/_app' && !entry.startsWith('pages/api/'))
    .map((entry) => {
      const route = entryToRoute(entry);
      if (!route) return null;
      const assets = getAssetsForEntry(stats, entry);
      const size = assets.reduce((sum, asset) => sum + (asset.gzipSize || 0), 0);
      const hotspot = describeHeaviestChunk(assets);
      return {
        entry,
        route,
        size,
        hotspot,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.size - a.size);

  const initialBudgetBytes = INITIAL_BUDGET_KB * KB;
  const routeBudgetBytes = ROUTE_BUDGET_KB * KB;

  console.log('\nBundle size report (gzip)');
  console.log('---------------------------');
  console.log(
    `Shared initial JS: ${formatKb(sharedBytes)} kB (budget ${INITIAL_BUDGET_KB} kB)` +
      (sharedBytes > initialBudgetBytes ? ' ⚠️' : ' ✅'),
  );
  if (sharedHotspot) {
    const hint = sharedHotspot.module ? `${sharedHotspot.module} via ${sharedHotspot.file}` : sharedHotspot.file;
    console.log(`Largest shared chunk: ${hint} (${sharedHotspot.kb} kB gzip)`);
  }

  console.log('\nRoute first-load bundles:');
  console.table(formatTable(routes, routeBudgetBytes));

  const routeViolations = routes.filter((route) => route.size > routeBudgetBytes);
  const hasInitialViolation = sharedBytes > initialBudgetBytes;

  if (hasInitialViolation) {
    let msg = `Shared initial bundle weighs ${formatKb(sharedBytes)} kB, exceeding the ${INITIAL_BUDGET_KB} kB budget.`;
    if (sharedHotspot?.module) {
      msg += ` Heavy module detected: ${sharedHotspot.module}. Consider lazy-loading it or moving it behind route-level code splitting.`;
    } else {
      msg += ' Consider lazy-loading rarely used providers or moving vendor dependencies to route-level boundaries.';
    }
    emitAnnotation(msg);
  }

  for (const { route, size, hotspot } of routeViolations) {
    let msg = `Route ${route} ships ${formatKb(size)} kB of initial JS, exceeding the ${ROUTE_BUDGET_KB} kB budget.`;
    if (hotspot?.module) {
      msg += ` Largest chunk traces back to ${hotspot.module}; split or dynamically import it to defer cost.`;
    } else if (hotspot?.file) {
      msg += ` Largest chunk ${hotspot.file} should be split or lazy-loaded.`;
    } else {
      msg += ' Consider dynamic imports or optional loading for heavy UI blocks.';
    }
    emitAnnotation(msg);
  }

  if (shouldCheck && (hasInitialViolation || routeViolations.length > 0)) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
