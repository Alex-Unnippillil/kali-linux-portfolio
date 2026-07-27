import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import fg from 'fast-glob';

const argMap = Object.create(null);
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const value = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : 'true';
  argMap[key] = value;
  if (value !== 'true') {
    i += 1;
  }
}

const configPath = argMap.config ?? 'bundle-report.config.json';
const headDir = argMap.head ?? '.next';
const baseDir = argMap.base;
const outputPath = argMap.output ?? 'bundle-report.json';

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function gzipSize(buffer) {
  return zlib.gzipSync(buffer).length;
}

function brotliSize(buffer) {
  return zlib.brotliCompressSync(buffer).length;
}

async function gatherForType(type, patterns, rootDir) {
  const entries = [];
  const globPatterns = Array.isArray(patterns) ? patterns : [patterns];
  const files = await fg(globPatterns, { cwd: rootDir, onlyFiles: true });
  for (const file of files) {
    const absolute = path.join(rootDir, file);
    const buffer = await fs.readFile(absolute);
    entries.push({
      type,
      file,
      raw: buffer.length,
      gzip: gzipSize(buffer),
      brotli: brotliSize(buffer)
    });
  }
  return entries;
}

async function collectMetrics(rootDir, globs) {
  const results = [];
  for (const [type, patterns] of Object.entries(globs)) {
    const entries = await gatherForType(type, patterns, rootDir);
    results.push(...entries);
  }
  const totals = {};
  for (const entry of results) {
    if (!totals[entry.type]) {
      totals[entry.type] = { raw: 0, gzip: 0, brotli: 0 };
    }
    totals[entry.type].raw += entry.raw;
    totals[entry.type].gzip += entry.gzip;
    totals[entry.type].brotli += entry.brotli;
  }
  return { assets: results, totals };
}

function toKb(value) {
  return value / 1024;
}

function formatTotals(totals) {
  const formatted = {};
  for (const [type, sizes] of Object.entries(totals)) {
    formatted[type] = {
      rawKb: toKb(sizes.raw),
      gzipKb: toKb(sizes.gzip),
      brotliKb: toKb(sizes.brotli)
    };
  }
  return formatted;
}

async function main() {
  const config = await readJson(configPath);
  const effectiveHeadDir = path.resolve(config.headBuildDir ?? headDir);
  const effectiveBaseDir = path.resolve(config.baseBuildDir ?? baseDir ?? '');
  const globs = config.globs ?? {};

  const headMetrics = await collectMetrics(effectiveHeadDir, globs);
  const baseMetrics = await (async () => {
    try {
      await fs.access(effectiveBaseDir);
      return await collectMetrics(effectiveBaseDir, globs);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  })();

  const diff = {};
  for (const [type, sizes] of Object.entries(headMetrics.totals)) {
    const baseSizes = baseMetrics?.totals?.[type];
    diff[type] = {
      raw: sizes.raw - (baseSizes?.raw ?? 0),
      gzip: sizes.gzip - (baseSizes?.gzip ?? 0),
      brotli: sizes.brotli - (baseSizes?.brotli ?? 0)
    };
  }

  const topAssetsCount = config.topAssets ?? 5;
  const sortedAssets = [...headMetrics.assets]
    .sort((a, b) => b.brotli - a.brotli)
    .slice(0, topAssetsCount)
    .map((asset) => ({
      type: asset.type,
      file: asset.file,
      rawKb: toKb(asset.raw),
      gzipKb: toKb(asset.gzip),
      brotliKb: toKb(asset.brotli)
    }));

  const budgets = {};
  if (config.budgets) {
    for (const [key, value] of Object.entries(config.budgets)) {
      let actual;
      if (key === 'jsTotalBrotliKb') {
        actual = toKb(headMetrics.totals.js?.brotli ?? 0);
      } else if (key === 'cssTotalBrotliKb') {
        actual = toKb(headMetrics.totals.css?.brotli ?? 0);
      }
      budgets[key] = {
        threshold: value,
        actual,
        pass: typeof actual === 'number' ? actual <= value : true
      };
    }
  }

  const report = {
    head: {
      totals: formatTotals(headMetrics.totals),
      topAssets: sortedAssets
    },
    base: baseMetrics
      ? {
          totals: formatTotals(baseMetrics.totals)
        }
      : null,
    diff: Object.fromEntries(
      Object.entries(diff).map(([type, sizes]) => [
        type,
        {
          rawKb: toKb(sizes.raw),
          gzipKb: toKb(sizes.gzip),
          brotliKb: toKb(sizes.brotli)
        }
      ])
    ),
    budgets
  };

  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

main().catch((error) => {
  console.error('Bundle report generation failed:', error);
  process.exitCode = 1;
});
