#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const EXPECTED_VERSION = '15.5.2';

const result = spawnSync('yarn', ['why', 'next'], { encoding: 'utf8' });

if (result.error) {
  console.error('Failed to execute "yarn why next":', result.error);
  process.exit(1);
}

const output = `${result.stdout}${result.stderr}`;

const match = output.match(/next@npm:([^\s]+)/);

if (!match) {
  console.error('Unable to determine the resolved Next.js version from "yarn why next" output.');
  console.error('Command output:\n', output.trim());
  process.exit(1);
}

const resolvedVersion = match[1];

if (resolvedVersion !== EXPECTED_VERSION) {
  console.error(
    `Unexpected Next.js version resolved. Expected ${EXPECTED_VERSION}, but found ${resolvedVersion}.`
  );
  console.error('Command output:\n', output.trim());
  process.exit(1);
}

console.log(`Next.js version check passed: ${resolvedVersion}`);
