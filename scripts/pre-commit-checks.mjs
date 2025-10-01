#!/usr/bin/env node
import { spawnSync } from 'child_process';

const MODES = new Set(['staged', 'ci']);

const runCommand = (cmd, args, options = {}) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const parseArgs = () => {
  let mode = 'staged';

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--mode=')) {
      const value = arg.slice('--mode='.length);
      if (!MODES.has(value)) {
        console.error(`Unknown mode: ${value}`);
        process.exit(1);
      }
      mode = value;
    }
  }

  return { mode };
};

const buildSinceFlag = () => {
  const baseRef = process.env.HOOK_BASE_REF || process.env.GITHUB_BASE_REF;
  if (!baseRef) {
    return undefined;
  }

  if (baseRef.startsWith('origin/')) {
    return baseRef;
  }

  return `origin/${baseRef}`;
};

const run = () => {
  const { mode } = parseArgs();

  const lintArgs = ['scripts/lint-changed.mjs'];
  const testArgs = ['scripts/test-staged.mjs'];
  const typeArgs = ['scripts/typecheck-staged.mjs'];
  const a11yArgs = ['scripts/a11y-staged.mjs'];

  if (mode === 'staged') {
    lintArgs.push('--staged');
    testArgs.push('--staged');
    typeArgs.push('--staged');
    a11yArgs.push('--staged');
  } else {
    const sinceRef = buildSinceFlag();
    if (sinceRef) {
      lintArgs.push(`--since=${sinceRef}`);
      testArgs.push(`--since=${sinceRef}`);
      typeArgs.push(`--since=${sinceRef}`);
      a11yArgs.push(`--since=${sinceRef}`);
    }
  }

  runCommand(process.execPath, lintArgs);
  runCommand(process.execPath, testArgs);
  runCommand(process.execPath, typeArgs);
  runCommand(process.execPath, a11yArgs);
};

run();

