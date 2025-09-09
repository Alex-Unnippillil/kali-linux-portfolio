#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

// Increase memory only in CI to avoid local overhead.
if (process.env.CI && !process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max-old-space-size=4096';
}

// Regenerate the precache manifest used by next-pwa before building
const precache = spawnSync('node', ['scripts/generate-sw.mjs'], {
  stdio: 'inherit',
  env: process.env,
});
if (precache.status !== 0) {
  process.exit(precache.status ?? 1);
}

const result = spawnSync('next', ['build'], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 0);
