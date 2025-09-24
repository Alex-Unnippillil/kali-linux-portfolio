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

(async () => {
  try {
    const yarnVersion = execSync('yarn --version', { encoding: 'utf8' }).trim();
    const nextVersion = require('next/package.json').version;
    console.log(`node: ${process.version}`);
    console.log(`yarn: ${yarnVersion}`);
    console.log(`next: ${nextVersion}`);

    await run('yarn', ['install', '--immutable']);
    await run('yarn', ['lint']);
    await run('yarn', ['tsc', '--noEmit']);
    await run('yarn', ['build']);

    const port = await getPort();
    const baseUrl = `http://localhost:${port}`;
    const server = spawn('yarn', ['start', '-p', String(port)], { stdio: 'inherit' });
    process.on('exit', () => server.kill());
    await waitOn({ resources: [baseUrl], timeout: 60000 });

    const verifyRoute = async (path, { expectedStatus = 200, expectPoweredBy = true } = {}) => {
      const res = await fetch(`${baseUrl}${path}`);
      const header = res.headers.get('x-powered-by');

      if (res.status !== expectedStatus) {
        throw new Error(`Route ${path} failed: status ${res.status}`);
      }

      if (expectPoweredBy && header !== 'Next.js') {
        throw new Error(`Route ${path} failed: header ${header}`);
      }

      console.log(`✓ ${path}`);
    };

    await verifyRoute('/api/healthz');

    const routes = [
      '/',
      '/dummy-form',
      '/video-gallery',
      '/profile',
      '/apps',
      '/apps/2048',
      '/apps/minesweeper',
    ];
    for (const route of routes) {
      await verifyRoute(route);
    }

    console.log('verify: PASS');
    server.kill();
  } catch (err) {
    console.error('verify: FAIL');
    console.error(err);
    process.exit(1);
  }
})();

