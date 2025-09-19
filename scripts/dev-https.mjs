import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const CERT_DIR = resolve(process.cwd(), process.env.LOCAL_DEV_CERT_DIR ?? '.certs');
const KEY_FILENAME = process.env.LOCAL_DEV_CERT_KEY ?? 'localhost-key.pem';
const CERT_FILENAME = process.env.LOCAL_DEV_CERT_CERT ?? 'localhost-cert.pem';
const KEY_PATH = resolve(CERT_DIR, KEY_FILENAME);
const CERT_PATH = resolve(CERT_DIR, CERT_FILENAME);

if (!existsSync(KEY_PATH) || !existsSync(CERT_PATH)) {
  console.error('Local HTTPS certificates were not found.');
  console.error('Run `yarn cert:local` after installing mkcert to generate them.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const extraArgs = process.argv.slice(2);
const port = process.env.PORT ?? '3000';
const hostname = process.env.HOSTNAME ?? 'localhost';

const child = spawn(
  process.execPath,
  [
    nextBin,
    'dev',
    '--hostname',
    hostname,
    '--port',
    port,
    '--experimental-https',
    '--experimental-https-key',
    KEY_PATH,
    '--experimental-https-cert',
    CERT_PATH,
    ...extraArgs,
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_ENABLE_DEV_SW: process.env.NEXT_PUBLIC_ENABLE_DEV_SW ?? 'true',
    },
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
