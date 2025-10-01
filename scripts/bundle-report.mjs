import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptFilename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFilename);

const DEFAULT_MANIFEST_PATH = path.join(scriptDir, '..', '.next', 'build-manifest.json');
const DEFAULT_BASELINE_PATH = path.join(scriptDir, '..', 'data', 'bundle-baseline.json');
const DEFAULT_THRESHOLD_BYTES = 30 * 1024;

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value && value !== 0) return [];
  return [value];
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '0 B';
  const absolute = Math.abs(bytes);
  if (absolute >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (absolute >= 1024) {
    return `${(bytes / 1024).toFixed(1)} kB`;
  }
  return `${bytes} B`;
}

export function collectRouteFiles(buildManifest = {}) {
  const pages = buildManifest.pages ?? {};
  const routes = new Map();
  for (const [route, files] of Object.entries(pages)) {
    if (!route.startsWith('/')) continue;
    if (route === '/_app' || route === '/_error' || route === '/_document') continue;
    if (route.startsWith('/_next') || route.startsWith('/__')) continue;
    const uniqueFiles = Array.from(new Set(toArray(files).flat()));
    routes.set(route, uniqueFiles);
  }
  return routes;
}

export async function computeRouteSizes(manifest, { distDir }) {
  const routes = collectRouteFiles(manifest);
  const results = new Map();
  for (const [route, files] of routes.entries()) {
    const contributions = [];
    let total = 0;
    for (const relativePath of files) {
      const absolutePath = path.join(distDir, relativePath);
      try {
        const stat = await fs.stat(absolutePath);
        const size = stat.size;
        total += size;
        contributions.push({ file: relativePath, size });
      } catch (error) {
        if (error && error.code === 'ENOENT') {
          throw new Error(`Missing asset for route ${route}: ${relativePath}`);
        }
        throw error;
      }
    }
    contributions.sort((a, b) => b.size - a.size);
    results.set(route, { size: total, files: contributions });
  }
  return results;
}

export function diffRoutes(baselineRoutes = {}, currentRoutes) {
  const current = new Map(currentRoutes);
  const diffs = [];
  const baseline = new Map(Object.entries(baselineRoutes));

  for (const [route, currentEntry] of current.entries()) {
    const baselineEntry = baseline.get(route);
    const baselineSize = baselineEntry?.size ?? 0;
    const delta = currentEntry.size - baselineSize;
    diffs.push({
      route,
      baseline: baselineSize,
      current: currentEntry.size,
      delta,
      files: currentEntry.files,
      status: baselineEntry ? 'updated' : 'added',
    });
  }

  for (const [route, baselineEntry] of baseline.entries()) {
    if (!current.has(route)) {
      diffs.push({
        route,
        baseline: baselineEntry.size,
        current: 0,
        delta: -baselineEntry.size,
        files: [],
        status: 'removed',
      });
    }
  }

  diffs.sort((a, b) => {
    if (Math.abs(b.delta) === Math.abs(a.delta)) {
      return a.route.localeCompare(b.route);
    }
    return Math.abs(b.delta) - Math.abs(a.delta);
  });

  return diffs;
}

export function findOffenders(diffs, thresholdBytes) {
  return diffs.filter((entry) => entry.delta > thresholdBytes);
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function loadManifest(manifestPath) {
  try {
    return await readJson(manifestPath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(`Build manifest not found at ${manifestPath}. Run \`next build\` first.`);
    }
    throw error;
  }
}

async function loadBaseline(baselinePath) {
  try {
    return await readJson(baselinePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeBaseline(baselinePath, routes) {
  const sortedEntries = Array.from(routes.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const payload = {
    generatedAt: new Date().toISOString(),
    routes: Object.fromEntries(sortedEntries.map(([route, value]) => [route, { size: value.size }])),
  };
  await fs.mkdir(path.dirname(baselinePath), { recursive: true });
  await fs.writeFile(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('-')) continue;
    if (token.startsWith('--')) {
      const [rawKey, rawValue] = token.split('=', 2);
      const key = rawKey.slice(2);
      if (rawValue !== undefined) {
        args[key] = rawValue;
        continue;
      }
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    } else {
      const key = token.slice(1);
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function resolveThreshold(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return DEFAULT_THRESHOLD_BYTES;
  }
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return Math.round(rawValue * 1024);
  }
  if (typeof rawValue !== 'string') {
    throw new Error(`Invalid threshold: ${rawValue}`);
  }
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_THRESHOLD_BYTES;
  }
  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)\s*(kb|k|mb|m|b)?$/);
  if (!match) {
    throw new Error(`Invalid threshold: ${rawValue}`);
  }
  const value = Number.parseFloat(match[1]);
  const unit = match[2] ?? 'kb';
  if (Number.isNaN(value)) {
    throw new Error(`Invalid threshold: ${rawValue}`);
  }
  switch (unit) {
    case 'mb':
    case 'm':
      return Math.round(value * 1024 * 1024);
    case 'b':
      return Math.round(value);
    case 'kb':
    case 'k':
    default:
      return Math.round(value * 1024);
  }
}

function renderSummary(diffs, offenders, thresholdBytes) {
  const lines = [];
  lines.push(`Threshold: ${formatBytes(thresholdBytes)} per route`);
  if (!diffs.length) {
    lines.push('No routes discovered in build manifest.');
    return lines.join('\n');
  }
  const increases = diffs.filter((entry) => entry.delta > 0);
  if (increases.length) {
    lines.push('Route deltas:');
    for (const entry of increases.slice(0, 20)) {
      const deltaLabel = entry.delta === 0 ? '±0 B' : `${entry.delta > 0 ? '+' : ''}${formatBytes(entry.delta)}`;
      lines.push(`  • ${entry.route}: ${deltaLabel} (now ${formatBytes(entry.current)})`);
    }
    if (increases.length > 20) {
      lines.push(`  … ${increases.length - 20} additional routes unchanged or decreased.`);
    }
  } else {
    lines.push('All tracked routes decreased or stayed flat.');
  }
  if (offenders.length) {
    lines.push('\nRoutes above threshold:');
    for (const offender of offenders) {
      lines.push(`  ✖ ${offender.route}: +${formatBytes(offender.delta)} (now ${formatBytes(offender.current)})`);
      const topFiles = offender.files.slice(0, 3);
      for (const file of topFiles) {
        lines.push(`      - ${file.file} (${formatBytes(file.size)})`);
      }
      if (offender.files.length > topFiles.length) {
        lines.push(`      - … ${offender.files.length - topFiles.length} more chunks`);
      }
    }
  } else {
    lines.push('\n✅ No routes exceeded the threshold.');
  }
  return lines.join('\n');
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(args.manifest ?? DEFAULT_MANIFEST_PATH);
  const distDir = path.resolve(args.dist ?? path.dirname(manifestPath));
  const baselinePath = path.resolve(args.baseline ?? DEFAULT_BASELINE_PATH);
  const thresholdBytes = args['threshold-bytes']
    ? Number.parseInt(args['threshold-bytes'], 10)
    : resolveThreshold(args.threshold);
  const outputPath = args.output ? path.resolve(args.output) : null;
  const shouldUpdateBaseline = Boolean(args['update-baseline'] ?? args.updateBaseline ?? args.update);

  const manifest = await loadManifest(manifestPath);
  const currentRoutes = await computeRouteSizes(manifest, { distDir });
  const baselineData = await loadBaseline(baselinePath);
  const baselineRoutes = baselineData?.routes ?? {};
  const diffs = diffRoutes(baselineRoutes, currentRoutes);
  const offenders = findOffenders(diffs, thresholdBytes);

  const report = {
    generatedAt: new Date().toISOString(),
    manifestPath,
    baselinePath,
    thresholdBytes,
    offenders: offenders.map((entry) => ({
      route: entry.route,
      delta: entry.delta,
      current: entry.current,
      baseline: entry.baseline,
      files: entry.files,
    })),
    routes: diffs.map((entry) => ({
      route: entry.route,
      delta: entry.delta,
      current: entry.current,
      baseline: entry.baseline,
      status: entry.status,
    })),
  };

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (shouldUpdateBaseline) {
    await writeBaseline(baselinePath, currentRoutes);
    console.log(`Baseline updated at ${baselinePath}`);
    return;
  }

  console.log(renderSummary(diffs, offenders, thresholdBytes));

  if (offenders.length) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

