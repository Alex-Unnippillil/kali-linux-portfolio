#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import path from 'path';

import { collectChangedFiles } from './utils/collect-changed-files.mjs';

const require = createRequire(import.meta.url);

const ESLINT_FILE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
]);

const run = () => {
  const rawArgs = process.argv.slice(2);
  const extraArgs = [];
  let stagedOnly = false;
  let since;

  for (const arg of rawArgs) {
    if (arg === '--staged') {
      stagedOnly = true;
    } else if (arg.startsWith('--since=')) {
      since = arg.slice('--since='.length);
    } else {
      extraArgs.push(arg);
    }
  }

  const files = collectChangedFiles({
    stagedOnly,
    since,
    extensions: ESLINT_FILE_EXTENSIONS,
  });
  if (files.length === 0) {
    console.log('No changed files with lintable extensions. Skipping ESLint.');
    return;
  }

  const eslintPkg = require.resolve('eslint/package.json');
  const eslintBin = path.resolve(path.dirname(eslintPkg), 'bin/eslint.js');

  const hasMaxWarnings = extraArgs.some((arg) => arg.startsWith('--max-warnings'));

  const eslintArgs = [];
  if (!hasMaxWarnings) {
    eslintArgs.push('--max-warnings=0');
  }
  eslintArgs.push(...extraArgs);
  eslintArgs.push(...files);

  console.log(`Running ESLint on ${files.length} changed file${files.length === 1 ? '' : 's'}...`);
  const result = spawnSync(process.execPath, [eslintBin, ...eslintArgs], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run();
