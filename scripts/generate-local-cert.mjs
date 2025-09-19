#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CERT_DIRECTORY = resolve(process.cwd(), '.certs');
const CERT_PATH = resolve(CERT_DIRECTORY, 'localhost.pem');
const KEY_PATH = resolve(CERT_DIRECTORY, 'localhost-key.pem');

function ensureDirectoryExists(directory) {
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
    console.log(`[certs] Created directory: ${directory}`);
  }
}

function ensureMkcertAvailable() {
  const mkcertCheck = spawnSync('mkcert', ['-version'], { stdio: 'ignore' });
  if (mkcertCheck.error || mkcertCheck.status !== 0) {
    console.error('[certs] mkcert is not installed or not available on PATH.');
    console.error('[certs] Install instructions: https://github.com/FiloSottile/mkcert#installation');
    process.exit(1);
  }
}

function certificatesAlreadyExist() {
  return existsSync(CERT_PATH) && existsSync(KEY_PATH);
}

function installCertificateAuthority() {
  console.log('[certs] Installing mkcert local CA (may prompt for sudo or password).');
  const install = spawnSync('mkcert', ['-install'], { stdio: 'inherit' });
  if (install.status !== 0) {
    console.error('[certs] Failed to install mkcert local CA.');
    process.exit(install.status ?? 1);
  }
}

function generateCertificates() {
  console.log('[certs] Generating certificates for localhost, 127.0.0.1, and ::1.');
  const result = spawnSync(
    'mkcert',
    ['-cert-file', CERT_PATH, '-key-file', KEY_PATH, 'localhost', '127.0.0.1', '::1'],
    { stdio: 'inherit' }
  );

  if (result.status !== 0) {
    console.error('[certs] mkcert failed to generate the requested certificates.');
    process.exit(result.status ?? 1);
  }
}

ensureMkcertAvailable();
ensureDirectoryExists(CERT_DIRECTORY);

if (certificatesAlreadyExist()) {
  console.log(`[certs] Certificate and key already exist at ${CERT_DIRECTORY}.`);
  console.log('[certs] Delete them manually if you need to regenerate new ones.');
  process.exit(0);
}

installCertificateAuthority();
generateCertificates();

console.log(`[certs] Saved certificate: ${CERT_PATH}`);
console.log(`[certs] Saved private key: ${KEY_PATH}`);
console.log('[certs] Certificates generated successfully.');
