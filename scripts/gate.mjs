import { spawn } from 'child_process';
import net from 'net';
import waitOn from 'wait-on';

const run = (cmd, args = [], opts = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });

const getPort = (preferred) =>
  new Promise((resolve, reject) => {
    if (preferred) {
      const srv = net.createServer();
      srv.once('error', (err) => {
        srv.close(() => reject(err));
      });
      srv.listen(preferred, () => {
        const { port } = srv.address();
        srv.close(() => resolve(port));
      });
      return;
    }

    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });

(async () => {
  let server;
  try {
    await run('node', ['scripts/verify.mjs']);
    await run('yarn', ['exec', 'playwright', 'install', '--with-deps']);

    const port = await getPort(Number(process.env.GATE_PORT) || 3000);
    server = spawn('yarn', ['start', '-p', String(port)], { stdio: 'inherit' });
    const cleanup = () => {
      if (server && !server.killed) {
        server.kill();
      }
    };
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(1);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(1);
    });

    await waitOn({ resources: [`http://127.0.0.1:${port}`], timeout: 60000 });

    const sharedEnv = { ...process.env, BASE_URL: `http://127.0.0.1:${port}` };

    await run('node', ['scripts/smoke-all-apps.mjs'], { env: sharedEnv });
    await run('node', ['scripts/a11y.mjs'], { env: sharedEnv });

    cleanup();
  } catch (err) {
    if (server && !server.killed) {
      server.kill();
    }
    console.error('gate: FAIL');
    console.error(err);
    process.exit(1);
  }
})();
