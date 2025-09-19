#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ENV_EXAMPLE_FILENAME = '.env.example';

const divider = '\n----------------------------------------\n';

async function loadEnvExampleKeys() {
  const envExamplePath = resolve(repoRoot, ENV_EXAMPLE_FILENAME);
  let contents;

  try {
    contents = await readFile(envExamplePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read ${ENV_EXAMPLE_FILENAME}: ${error.message}`);
  }

  const keys = new Set();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');

    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();

    if (key) {
      keys.add(key);
    }
  }

  return keys;
}

async function fetchVercelEnvironmentKeys() {
  let stdout;

  try {
    ({ stdout } = await execFileAsync('vercel', ['env', 'ls', '--json'], {
      cwd: repoRoot,
      maxBuffer: 10 * 1024 * 1024
    }));
  } catch (error) {
    const suggestion =
      'Ensure the Vercel CLI is installed and authenticated. ' +
      'You may also need to set VERCEL_ORG_ID, VERCEL_PROJECT_ID, and VERCEL_TOKEN in CI.';

    if (error.stdout) {
      stdout = error.stdout;
    }

    throw new Error(`Failed to execute "vercel env ls --json". ${suggestion}${divider}${error.message}`);
  }

  let parsed;

  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      'Unable to parse the JSON output from "vercel env ls --json". ' +
        'Verify that the CLI version supports the --json flag and rerun the command.'
    );
  }

  const envEntries = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.envs)
      ? parsed.envs
      : Array.isArray(parsed?.environments)
        ? parsed.environments
        : [];

  if (envEntries.length === 0) {
    console.warn('No environment variables were returned by the Vercel API.');
  }

  const keys = new Set();

  for (const entry of envEntries) {
    const key = typeof entry?.key === 'string' ? entry.key.trim() : '';

    if (key) {
      keys.add(key);
    }
  }

  return keys;
}

function reportMismatch({ missingOnVercel, missingLocally }) {
  if (missingOnVercel.length > 0) {
    console.error('These keys exist in .env.example but are missing from Vercel:');
    console.error(missingOnVercel.join('\n'));
  }

  if (missingLocally.length > 0) {
    console.error('\nThese keys exist in Vercel but not in .env.example:');
    console.error(missingLocally.join('\n'));
  }
}

async function main() {
  const [localKeys, vercelKeys] = await Promise.all([
    loadEnvExampleKeys(),
    fetchVercelEnvironmentKeys()
  ]);

  const missingOnVercel = [...localKeys].filter((key) => !vercelKeys.has(key)).sort();
  const missingLocally = [...vercelKeys].filter((key) => !localKeys.has(key)).sort();

  if (missingOnVercel.length > 0 || missingLocally.length > 0) {
    reportMismatch({ missingOnVercel, missingLocally });
    process.exitCode = 1;
    return;
  }

  console.log('✅ Environment variable parity check passed.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

