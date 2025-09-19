import { spawn } from 'node:child_process';
import net from 'node:net';
import waitOn from 'wait-on';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const run = (cmd, args = [], options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed: ${cmd} ${args.join(' ')}`));
      }
    });
  });

const getPort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port);
        } else {
          reject(new Error('Failed to allocate port'));
        }
      });
    });
  });

let devServer;

(async () => {
  const stopServer = async () => {
    if (devServer && devServer.exitCode === null) {
      devServer.kill('SIGTERM');
      await new Promise((resolve) => devServer.once('exit', resolve));
    }
    devServer = undefined;
  };

  try {
    console.log('\n▶ yarn install');
    await run('yarn', ['install']);

    const tscBin = require.resolve('typescript/lib/tsc.js');
    const nextBin = require.resolve('next/dist/bin/next');
    const playwrightCli = require.resolve('@playwright/test/cli');

    console.log('\n▶ playwright install --with-deps');
    await run('node', [playwrightCli, 'install', '--with-deps']);

    console.log('\n▶ yarn lint --max-warnings=0');
    await run('yarn', ['lint', '--max-warnings=0']);

    console.log('\n▶ yarn test');
    await run('yarn', ['test'], { env: { ...process.env, CI: '1' } });

    console.log('\n▶ tsc --noEmit');
    await run('node', [tscBin, '--noEmit']);

    console.log('\n▶ next build');
    await run('node', [nextBin, 'build']);

    const port = await getPort();
    console.log(`\n▶ next start (port ${port})`);
    devServer = spawn('node', [nextBin, 'start', '-p', String(port)], {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(port) },
    });

    const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    shutdownSignals.forEach((signal) => {
      process.on(signal, () => {
        if (devServer && devServer.exitCode === null) {
          devServer.kill('SIGTERM');
        }
        process.exit(1);
      });
    });

    process.on('exit', () => {
      if (devServer && devServer.exitCode === null) {
        devServer.kill('SIGTERM');
      }
    });

    await waitOn({ resources: [`http://127.0.0.1:${port}`], timeout: 120000 });
    console.log(`Server is ready at http://127.0.0.1:${port}`);

    console.log('\n▶ Playwright smoke (tests/apps.smoke.spec.ts)');
    await run('node', [playwrightCli, 'test', 'tests/apps.smoke.spec.ts', '--config=playwright.config.ts'], {
      env: { ...process.env, BASE_URL: `http://127.0.0.1:${port}` },
    });

    console.log('\n✅ verify:full PASS');
  } catch (error) {
    console.error('\n❌ verify:full FAIL');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await stopServer();
  }
})();
