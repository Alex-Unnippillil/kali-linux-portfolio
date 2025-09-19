#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const CERT_DIRECTORY = resolve(process.cwd(), '.certs');
const CERT_PATH = resolve(CERT_DIRECTORY, 'localhost.pem');
const KEY_PATH = resolve(CERT_DIRECTORY, 'localhost-key.pem');

function assertCertificateExists(path, label) {
  if (!existsSync(path)) {
    console.error(`[dev:https] Missing ${label} at ${path}.`);
    console.error('[dev:https] Run "yarn certs:generate" to create mkcert certificates.');
    process.exit(1);
  }
}

assertCertificateExists(CERT_PATH, 'certificate');
assertCertificateExists(KEY_PATH, 'private key');

const host = process.env.HTTPS_HOST || process.env.HOST || 'localhost';
const port = process.env.PORT || process.env.HTTPS_PORT || '3000';
const extraArgs = process.argv.slice(2);

const child = spawn(
  process.execPath,
  [
    nextBin,
    'dev',
    '--hostname',
    host,
    '--port',
    port,
    '--experimental-https',
    '--experimental-https-cert',
    CERT_PATH,
    '--experimental-https-key',
    KEY_PATH,
    ...extraArgs,
  ],
  {
    env: {
      ...process.env,
    },
    stdio: 'inherit',
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(0);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[dev:https] Failed to start Next.js dev server:', error);
  process.exit(1);
});
