import { execSync, spawn } from 'child_process';
import { createRequire } from 'module';
import net from 'net';
import waitOn from 'wait-on';

const require = createRequire(import.meta.url);

const run = (cmd, args = [], opts = {}) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
  child.on('exit', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    }
  });
});

const getPort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });

const stopServer = (child) =>
  new Promise((resolve) => {
    if (!child) {
      resolve();
      return;
    }
    const done = () => resolve();
    child.once('exit', done);
    child.kill();
  });

(async () => {
  try {
    const yarnVersion = execSync('yarn --version', { encoding: 'utf8' }).trim();
    const nextVersion = require('next/package.json').version;
    console.log(`node: ${process.version}`);
    console.log(`yarn: ${yarnVersion}`);
    console.log(`next: ${nextVersion}`);

    await run('yarn', ['install', '--immutable']);
    await run('npx', ['playwright', 'install', 'chromium']);
    await run('yarn', ['lint']);
    await run('yarn', ['tsc', '--noEmit']);

    const runSpeedInsightsCheck = (mode, port) =>
      run('npx', ['playwright', 'test', 'playwright/speed-insights.spec.ts'], {
        env: {
          ...process.env,
          BASE_URL: `http://localhost:${port}`,
          PLAYWRIGHT_SERVER_MODE: mode,
        },
      });

    const devPort = await getPort();
    const devServer = spawn('yarn', ['dev', '-p', String(devPort)], { stdio: 'inherit' });
    const devExit = () => devServer.kill();
    process.on('exit', devExit);
    try {
      await waitOn({ resources: [`http://localhost:${devPort}`], timeout: 60000 });
      await runSpeedInsightsCheck('development', devPort);
    } finally {
      process.off('exit', devExit);
      await stopServer(devServer);
    }

    await run('yarn', ['build']);

    const port = await getPort();
    const server = spawn('yarn', ['start', '-p', String(port)], { stdio: 'inherit' });
    const serverExit = () => server.kill();
    process.on('exit', serverExit);
    try {
      await waitOn({ resources: [`http://localhost:${port}`], timeout: 60000 });

      const routes = ['/', '/dummy-form', '/video-gallery', '/profile'];
      for (const route of routes) {
        const res = await fetch(`http://localhost:${port}${route}`);
        const header = res.headers.get('x-powered-by');
        if (res.status !== 200 || header !== 'Next.js') {
          throw new Error(`Route ${route} failed: status ${res.status}, header ${header}`);
        }
        console.log(`✓ ${route}`);
      }

      await runSpeedInsightsCheck('production', port);

      console.log('verify: PASS');
    } finally {
      process.off('exit', serverExit);
      await stopServer(server);
    }
  } catch (err) {
    console.error('verify: FAIL');
    console.error(err);
    process.exit(1);
  }
})();

