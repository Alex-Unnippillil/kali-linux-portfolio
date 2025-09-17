#!/usr/bin/env node
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_LIMIT_KB = 120;
const limitKb = parseLimitFromArgs(DEFAULT_LIMIT_KB);
const limitBytes = Math.round(limitKb * 1024);

const repoRoot = process.cwd();
const cssFiles = [];
const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.next',
  'out',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.vercel',
  '.cache',
  '.tmp',
  'tmp',
  'temp',
  '.pnpm',
  '.yarn',
  'playwright-report',
]);

async function main() {
  await walkDirectory(repoRoot);

  const totalBytes = cssFiles.reduce((sum, file) => sum + file.bytes, 0);
  const formattedTotal = formatBytes(totalBytes);
  const formattedLimit = formatBytes(limitBytes);

  console.log(`Found ${cssFiles.length} CSS file${cssFiles.length === 1 ? '' : 's'}. Total size: ${formattedTotal} (limit: ${formattedLimit}).`);

  if (cssFiles.length) {
    const topFiles = [...cssFiles]
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5)
      .map((file) => `- ${file.path} — ${formatBytes(file.bytes)}`)
      .join('\n');

    console.log('Top CSS files by size:\n' + topFiles);
  }

  if (totalBytes > limitBytes) {
    const overage = formatBytes(totalBytes - limitBytes);
    const summary = `Total CSS size ${formattedTotal} exceeds limit ${formattedLimit} by ${overage}.`;
    console.error(`::error title=CSS budget exceeded::${summary} Reduce CSS payload or adjust the budget if this growth is intentional.`);
    process.exit(1);
  }

  console.log('CSS budget check passed ✅');
}

async function walkDirectory(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    console.warn(`Skipping directory ${directory}: ${error.message}`);
    return;
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(repoRoot, fullPath);

    if (entry.isDirectory()) {
      if (shouldIgnoreDirectory(relativePath)) {
        continue;
      }
      await walkDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      const { size } = await stat(fullPath);
      cssFiles.push({
        path: relativePath.split(path.sep).join('/'),
        bytes: size,
      });
    }
  }
}

function shouldIgnoreDirectory(relativePath) {
  if (!relativePath) {
    return false;
  }

  const segments = relativePath.split(path.sep);
  return segments.some((segment) => IGNORED_DIRECTORIES.has(segment));
}

function parseLimitFromArgs(defaultLimit) {
  const limitArg = process.argv.slice(2).find((value) => value.startsWith('--limit='));
  if (!limitArg) {
    return defaultLimit;
  }

  const parsedValue = Number.parseFloat(limitArg.split('=')[1]);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    console.error('::error title=Invalid limit argument::Expected a positive number for --limit.');
    process.exit(1);
  }

  return parsedValue;
}

function formatBytes(bytes) {
  const kilobytes = bytes / 1024;
  const precision = kilobytes >= 100 ? 1 : 2;
  return `${kilobytes.toFixed(precision)} KB`;
}

main().catch((error) => {
  console.error('::error title=CSS budget check failed unexpectedly::' + error.message);
  process.exit(1);
});
