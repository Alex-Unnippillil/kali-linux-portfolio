#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

// Increase memory only in CI to avoid local overhead.
if (process.env.CI && !process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max-old-space-size=4096';
}

const result = spawnSync('next', ['build'], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 0);
