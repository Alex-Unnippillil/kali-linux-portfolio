#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

const patterns = ['**/*.{test,spec}.{js,jsx,ts,tsx}'];
const ignore = [
  'node_modules/**',
  '.next/**',
  'playwright/**',
  'tests/playwright/**',
];

const flaggedSuites = [];
for (const file of await fg(patterns, { cwd: repoRoot, ignore })) {
  const absolute = resolve(repoRoot, file);
  const source = await readFile(absolute, 'utf8');
  if (
    source.includes('describeFlaky(') ||
    source.includes('testFlaky(') ||
    source.includes('itFlaky(')
  ) {
    flaggedSuites.push(file);
  }
}

flaggedSuites.sort();

if (flaggedSuites.length === 0) {
  console.log('No quarantined Jest suites were detected.');
  process.exit(0);
}

console.log('Running quarantined Jest suites:\n');
for (const suite of flaggedSuites) {
  console.log(` • ${suite}`);
}
console.log('');

const jestBin = resolve(repoRoot, 'node_modules', 'jest', 'bin', 'jest.js');
const args = ['--runInBand', '--runTestsByPath', ...flaggedSuites];

const child = spawn(process.execPath, [jestBin, ...args], {
  stdio: 'inherit',
  cwd: repoRoot,
  env: { ...process.env, RUN_FLAKY: 'true' },
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
