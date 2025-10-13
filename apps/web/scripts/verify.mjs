import { execSync, spawn } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import waitOn from 'wait-on';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

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
  });

const scriptExists = (name) => Boolean(packageJson.scripts?.[name]);

const runYarnScript = async (scriptNames, { optional = false, fallbackArgs, env = {} } = {}) => {
  const names = Array.isArray(scriptNames) ? scriptNames : [scriptNames];
  const scriptName = names.find((name) => scriptExists(name));

  if (scriptName) {
    await run('yarn', [scriptName], { env: { ...process.env, ...env } });
    return true;
  }

  if (fallbackArgs) {
    await run('yarn', fallbackArgs, { env: { ...process.env, ...env } });
    return true;
  }

  if (optional) {
    console.log(`Skipping ${names.join(' / ')} (no script configured)`);
    return false;
  }

  throw new Error(`Required script not found: ${names[0]}`);
};

const runStage = async (label, fn) => {
  console.log(`\n=== ${label} ===`);
  try {
    await fn();
    console.log(`✓ ${label}`);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    err.message = `${label}: ${err.message}`;
    throw err;
  }
};

(async () => {
  let server;
  try {
    const yarnVersion = execSync('yarn --version', { encoding: 'utf8' }).trim();
    const nextVersion = require('next/package.json').version;
    console.log(`node: ${process.version}`);
    console.log(`yarn: ${yarnVersion}`);
    console.log(`next: ${nextVersion}`);

    await runStage('Install dependencies', () => run('yarn', ['install', '--immutable']));
    await runStage('Check dependency dedupe', () =>
      runYarnScript('dedupe:check', { fallbackArgs: ['dedupe', '--check'] }),
    );
    await runStage('Lint', () => runYarnScript('lint'));
    await runStage('Typecheck', () => runYarnScript('typecheck', { fallbackArgs: ['tsc', '--noEmit'] }));
    await runStage('Unit tests', () => runYarnScript('test', { env: { CI: '1' } }));
    await runStage('Build', () => runYarnScript('build'));

    const port = Number(process.env.VERIFY_PORT ?? 3000);
    const baseUrl = `http://localhost:${port}`;

    await runStage('Start production server', async () => {
      server = spawn('yarn', ['start', '-p', String(port)], { stdio: 'inherit' });
      process.on('exit', () => {
        if (server) {
          server.kill();
        }
      });
      await waitOn({ resources: [baseUrl], timeout: 60000 });
    });

    await runStage('Smoke tests', () =>
      runYarnScript('smoke', { env: { BASE_URL: baseUrl } }),
    );

    await runStage('Pa11y accessibility scan', () =>
      runYarnScript('a11y', { env: { BASE_URL: baseUrl } }),
    );

    await runStage('Bundle budget checks', async () => {
      const executed = await runYarnScript(['bundle-budget', 'bundle:budget', 'budget:check'], {
        optional: true,
        env: { BASE_URL: baseUrl },
      });
      if (!executed) {
        console.log('No bundle budget script configured; skipping.');
      }
    });

    await runStage('Lighthouse audit', async () => {
      const executed = await runYarnScript(['lighthouse', 'lhci', 'perf:lighthouse'], {
        optional: true,
        env: { BASE_URL: baseUrl },
      });
      if (!executed) {
        console.log('No Lighthouse script configured; skipping.');
      }
    });

    const routes = ['/', '/dummy-form', '/video-gallery', '/profile'];
    await runStage('Route smoke check', async () => {
      for (const route of routes) {
        const url = `${baseUrl}${route}`;
        const res = await fetch(url);
        const header = res.headers.get('x-powered-by');
        if (res.status !== 200 || header !== 'Next.js') {
          throw new Error(`Route ${route} failed: status ${res.status}, header ${header}`);
        }
        console.log(`✓ ${route}`);
      }
    });

    console.log('\nverify: PASS');
  } catch (err) {
    console.error('\nverify: FAIL');
    console.error(err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.kill();
    }
  }
})();

