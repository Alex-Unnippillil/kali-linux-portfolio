#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

import { collectChangedFiles } from './utils/collect-changed-files.mjs';

const require = createRequire(import.meta.url);

const TEST_FILE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const run = () => {
  const rawArgs = process.argv.slice(2);
  let stagedOnly = false;
  let since;

  for (const arg of rawArgs) {
    if (arg === '--staged') {
      stagedOnly = true;
    } else if (arg.startsWith('--since=')) {
      since = arg.slice('--since='.length);
    }
  }

  const files = collectChangedFiles({
    stagedOnly,
    since,
    extensions: TEST_FILE_EXTENSIONS,
  });

  if (files.length === 0) {
    console.log('No changed testable files. Skipping targeted Jest run.');
    return;
  }

  const jestPkg = require.resolve('jest/package.json');
  const jestBin = path.resolve(path.dirname(jestPkg), 'bin/jest.js');
  const cacheDir = path.resolve('.cache/jest');

  ensureDir(cacheDir);

  const result = spawnSync(
    process.execPath,
    [
      jestBin,
      '--findRelatedTests',
      ...files,
      '--runInBand',
      '--passWithNoTests',
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        CI: process.env.CI ?? '0',
        JEST_CACHE_DIR: cacheDir,
      },
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run();

