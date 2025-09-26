#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const patchesDir = resolve(__dirname, '../.yarn/patches');

try {
  const entries = await readdir(patchesDir);

  if (entries.length > 0) {
    console.error(
      'Yarn patches detected in .yarn/patches. Please remove them before committing.'
    );
    console.error(`Found entries: ${entries.join(', ')}`);
    process.exitCode = 1;
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    process.exit(0);
  } else {
    console.error('Unable to inspect .yarn/patches directory.');
    console.error(error);
    process.exit(1);
  }
}
