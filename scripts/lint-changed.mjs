#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { collectChangedFiles } from './changed-files.mjs';

const require = createRequire(import.meta.url);
const run = () => {
  const files = collectChangedFiles();
  if (files.length === 0) {
    console.log('No changed files with lintable extensions. Skipping ESLint.');
    return;
  }
  const eslintPkg = require.resolve('eslint/package.json');
  const eslintBin = path.resolve(path.dirname(eslintPkg), 'bin/eslint.js');
  const extraArgs = process.argv.slice(2);
  const hasMaxWarnings = extraArgs.some((arg) => arg.startsWith('--max-warnings'));
  const hasExplicitConfig = extraArgs.some((arg) => arg === '--config' || arg.startsWith('--config='));
  const eslintArgs = [];
  if (!hasMaxWarnings) eslintArgs.push('--max-warnings=0');
  if (!hasExplicitConfig) {
    eslintArgs.push('--config', path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../eslint.config.mjs'));
  }
  eslintArgs.push(...extraArgs, ...files);
  console.log(`Running ESLint on ${files.length} changed file${files.length === 1 ? '' : 's'}...`);
  const result = spawnSync(process.execPath, [eslintBin, ...eslintArgs], {
    stdio: 'inherit',
    env: { ...process.env, ESLINT_USE_FLAT_CONFIG: process.env.ESLINT_USE_FLAT_CONFIG ?? 'true' },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
run();
