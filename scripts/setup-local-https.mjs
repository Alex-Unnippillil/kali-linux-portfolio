import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CERT_DIR = resolve(process.cwd(), process.env.LOCAL_DEV_CERT_DIR ?? '.certs');
const KEY_FILENAME = process.env.LOCAL_DEV_CERT_KEY ?? 'localhost-key.pem';
const CERT_FILENAME = process.env.LOCAL_DEV_CERT_CERT ?? 'localhost-cert.pem';
const KEY_PATH = resolve(CERT_DIR, KEY_FILENAME);
const CERT_PATH = resolve(CERT_DIR, CERT_FILENAME);

const RAW_HOSTS = process.env.LOCAL_DEV_CERT_HOSTS ?? 'localhost,127.0.0.1,::1';
const HOSTS = RAW_HOSTS.split(',')
  .map((host) => host.trim())
  .filter(Boolean);

if (HOSTS.length === 0) {
  console.error('No hostnames provided. Set LOCAL_DEV_CERT_HOSTS to a comma-separated list.');
  process.exit(1);
}

if (!existsSync(CERT_DIR)) {
  mkdirSync(CERT_DIR, { recursive: true });
}

const alreadyHasCerts = existsSync(KEY_PATH) && existsSync(CERT_PATH);
if (alreadyHasCerts && process.env.LOCAL_DEV_CERT_FORCE !== 'true') {
  console.log(`Existing certificate and key found at ${CERT_PATH} and ${KEY_PATH}.`);
  console.log('Set LOCAL_DEV_CERT_FORCE=true to regenerate them.');
  process.exit(0);
}

const mkcertCheck = spawnSync('mkcert', ['-version'], { encoding: 'utf8' });
if (mkcertCheck.error || mkcertCheck.status !== 0) {
  console.error('mkcert is required but was not found. Install mkcert from https://github.com/FiloSottile/mkcert');
  console.error('and run `mkcert -install` once before generating certificates.');
  process.exit(1);
}

const args = ['-key-file', KEY_PATH, '-cert-file', CERT_PATH, ...HOSTS];
console.log(`Generating mkcert certificate for: ${HOSTS.join(', ')}`);
const result = spawnSync('mkcert', args, { stdio: 'inherit' });

if (result.status !== 0) {
  console.error('mkcert failed to create the certificate.');
  process.exit(result.status ?? 1);
}

if (!existsSync(KEY_PATH) || !existsSync(CERT_PATH)) {
  console.error('mkcert reported success, but certificate files were not found.');
  process.exit(1);
}

console.log('Local HTTPS certificates ready.');
console.log(`Key:  ${KEY_PATH}`);
console.log(`Cert: ${CERT_PATH}`);
