#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);

const ESLINT_FILE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
]);

const execGit = (args) => {
  try {
    const result = spawnSync('git', args, { encoding: 'utf8' });
    if (result.status !== 0) {
      return '';
    }
    return result.stdout.trim();
  } catch {
    return '';
  }
};

const resolveBaseRevision = () => {
  const candidates = [
    ['merge-base', '--fork-point', 'origin/main', 'HEAD'],
    ['merge-base', 'origin/main', 'HEAD'],
    ['merge-base', '--fork-point', 'origin/master', 'HEAD'],
    ['merge-base', 'origin/master', 'HEAD'],
    ['rev-parse', 'HEAD^'],
  ];

  for (const candidate of candidates) {
    const result = execGit(candidate);
    if (result) {
      return result.split('\n')[0];
    }
  }

  return '';
};

const collectChangedFiles = () => {
  const files = new Set();

  const base = resolveBaseRevision();
  if (base) {
    const diffBase = execGit(['diff', '--name-only', '--diff-filter=ACMRTUXB', `${base}...HEAD`]);
    diffBase
      .split('\n')
      .filter(Boolean)
      .forEach((file) => files.add(file));
  }

  const diffHead = execGit(['diff', '--name-only', '--diff-filter=ACMRTUXB', 'HEAD']);
  diffHead
    .split('\n')
    .filter(Boolean)
    .forEach((file) => files.add(file));

  const untracked = execGit(['ls-files', '--others', '--exclude-standard']);
  untracked
    .split('\n')
    .filter(Boolean)
    .forEach((file) => files.add(file));

  return Array.from(files).filter((file) => {
    if (file.split(path.sep).includes('node_modules')) {
      return false;
    }
    if (!fs.existsSync(file)) {
      return false;
    }
    const ext = path.extname(file);
    return ESLINT_FILE_EXTENSIONS.has(ext);
  });
};

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
  if (!hasMaxWarnings) {
    eslintArgs.push('--max-warnings=0');
  }
  if (!hasExplicitConfig) {
    const configPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../eslint.config.mjs',
    );
    eslintArgs.push('--config', configPath);
  }
  eslintArgs.push(...extraArgs);
  eslintArgs.push(...files);

  console.log(`Running ESLint on ${files.length} changed file${files.length === 1 ? '' : 's'}...`);
  const result = spawnSync(process.execPath, [eslintBin, ...eslintArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ESLINT_USE_FLAT_CONFIG: process.env.ESLINT_USE_FLAT_CONFIG ?? 'true',
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run();
