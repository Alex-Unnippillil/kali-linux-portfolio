#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const DEFAULT_STATS_PATH = '.next/analyze/client.json';
const DEFAULT_ENTRY_KEYS = ['main', 'pages/_app'];
const DEFAULT_BUDGET_KB = 275;

function parseEntryKeys(raw) {
  if (!raw) return DEFAULT_ENTRY_KEYS;
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function toKilobytes(bytes) {
  return bytes / 1024;
}

async function loadStats(statsPath) {
  try {
    const raw = await readFile(statsPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Bundle analyzer output is not an array.');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Unable to read bundle stats from ${statsPath}: ${error.message}`);
  }
}

function normalizeBudget(rawBudget) {
  if (rawBudget === undefined) {
    return DEFAULT_BUDGET_KB;
  }
  const budget = Number.parseFloat(rawBudget);
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new Error(`MAIN_BUNDLE_BUDGET_KB must be a positive number. Received: ${rawBudget}`);
  }
  return budget;
}

function collectEntrypointBytes(stats, entryKeys) {
  const seenLabels = new Set();
  const contributions = [];
  let totalBytes = 0;

  for (const asset of stats) {
    if (!asset || typeof asset !== 'object') continue;
    const { label, gzipSize, parsedSize, statSize, isInitialByEntrypoint } = asset;
    if (typeof label !== 'string') continue;
    if (!isInitialByEntrypoint || typeof isInitialByEntrypoint !== 'object') continue;

    const matchedKeys = entryKeys.filter((key) => Boolean(isInitialByEntrypoint[key]));
    if (matchedKeys.length === 0) continue;
    if (seenLabels.has(label)) continue;

    const sizeBytes = Number(gzipSize ?? parsedSize ?? statSize ?? 0);
    if (!Number.isFinite(sizeBytes)) continue;

    seenLabels.add(label);
    totalBytes += sizeBytes;
    contributions.push({
      label,
      entrypoints: matchedKeys,
      bytes: sizeBytes,
    });
  }

  if (contributions.length === 0) {
    throw new Error(
      `No assets matched the monitored entrypoints: ${entryKeys.join(', ') || '(none)'}. ` +
        'Ensure the bundle analyzer ran with ANALYZE_MODE=json.'
    );
  }

  contributions.sort((a, b) => b.bytes - a.bytes);
  return { totalBytes, contributions };
}

async function main() {
  const statsPath = resolve(process.cwd(), process.argv[2] ?? DEFAULT_STATS_PATH);
  const entryKeys = parseEntryKeys(process.env.MAIN_BUNDLE_ENTRY_KEYS);
  const budgetKb = normalizeBudget(process.env.MAIN_BUNDLE_BUDGET_KB);

  const stats = await loadStats(statsPath);
  const { totalBytes, contributions } = collectEntrypointBytes(stats, entryKeys);
  const totalKb = toKilobytes(totalBytes);

  console.log(`Bundle budget: ${budgetKb.toFixed(2)} kB`);
  console.log(`Measured entrypoints: ${entryKeys.join(', ')}`);
  console.log('Top contributors:');
  for (const { label, entrypoints, bytes } of contributions) {
    const kb = toKilobytes(bytes);
    console.log(`  • ${label} [${entrypoints.join(', ')}] — ${kb.toFixed(2)} kB`);
  }
  console.log(`Total gzip size: ${totalKb.toFixed(2)} kB`);

  if (totalKb > budgetKb) {
    console.error(
      `\n❌ Bundle budget exceeded by ${(totalKb - budgetKb).toFixed(2)} kB. ` +
        'Use dynamic imports, split large dependencies, or move rarely used tools behind lazy loaders before retrying.'
    );
    process.exit(1);
  }

  console.log('\n✅ Bundle size within budget.');
}

main().catch((error) => {
  console.error(`Failed to evaluate bundle budget: ${error.message}`);
  process.exit(1);
});
