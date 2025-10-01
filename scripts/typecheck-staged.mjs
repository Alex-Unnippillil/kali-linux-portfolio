#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

import { collectChangedFiles } from './utils/collect-changed-files.mjs';

const require = createRequire(import.meta.url);

const TS_FILE_EXTENSIONS = new Set(['.ts', '.tsx']);

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
    extensions: TS_FILE_EXTENSIONS,
  });

  if (files.length === 0) {
    console.log('No changed TypeScript files. Skipping incremental type check.');
    return;
  }

  const tsPkg = require.resolve('typescript/package.json');
  const tsBin = path.resolve(path.dirname(tsPkg), 'bin/tsc');
  const cacheDir = path.resolve('.cache/typescript');
  const tsBuildInfoFile = path.join(cacheDir, 'typecheck.tsbuildinfo');

  ensureDir(cacheDir);

  const result = spawnSync(
    process.execPath,
    [
      tsBin,
      '--noEmit',
      '--incremental',
      '--tsBuildInfoFile',
      tsBuildInfoFile,
      '--pretty',
      'false',
    ],
    { stdio: 'inherit' },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run();

