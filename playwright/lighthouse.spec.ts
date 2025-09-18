import { test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

type SpawnEnv = NodeJS.ProcessEnv | undefined;

const require = createRequire(import.meta.url);
const lhciCli = require.resolve('@lhci/cli/src/cli.js');

async function runLhci(args: string[], env?: SpawnEnv) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [lhciCli, ...args], {
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const reason =
        signal !== null
          ? new Error(`LHCI exited with signal ${signal}`)
          : new Error(`LHCI exited with status ${code}`);
      reject(reason);
    });
  });
}

test.describe('Lighthouse CI', () => {
  test('meets quality budgets for /apps/alex', async ({ baseURL }) => {
    const base = baseURL || process.env.BASE_URL || 'http://localhost:3000';
    const targetUrl = new URL('/apps/alex', base).toString();

    await runLhci(
      ['autorun', '--config', path.resolve('lighthouserc.cjs')],
      { LHCI_TARGET_URL: targetUrl },
    );
  });
});
