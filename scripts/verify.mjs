import { execSync, spawn } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { createRequire } from 'module';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import waitOn from 'wait-on';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const run = (cmd, args = [], opts = {}) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { stdio: 'inherit', cwd: rootDir, ...opts });
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

const getOutputSetting = (env = {}) => {
  const mergedEnv = { ...process.env, ...env };
  if (!('NEXT_PUBLIC_STATIC_EXPORT' in env)) {
    delete mergedEnv.NEXT_PUBLIC_STATIC_EXPORT;
  }
  return execSync("node -e \"console.log(require('./next.config.js').output || '')\"", {
    cwd: rootDir,
    env: mergedEnv,
    encoding: 'utf8',
  }).trim();
};

const cleanNextDir = () => {
  const nextDir = path.join(rootDir, '.next');
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
};

const assertExportArtifacts = (expected) => {
  const exportDir = path.join(rootDir, '.next', 'export');
  const detailFile = path.join(rootDir, '.next', 'export-detail.json');
  const hasExportDir = existsSync(exportDir);
  const hasDetailFile = existsSync(detailFile);
  if (expected && (!hasExportDir || !hasDetailFile)) {
    throw new Error('Static export build missing .next/export artifacts');
  }
  if (!expected && (hasExportDir || hasDetailFile)) {
    throw new Error('Serverful build unexpectedly generated static export artifacts');
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

    const serverOutput = getOutputSetting();
    if (serverOutput === 'export') {
      throw new Error('NEXT_PUBLIC_STATIC_EXPORT should be unset for serverful builds');
    }

    await run('yarn', ['install', '--immutable']);
    await run('yarn', ['lint']);
    await run('yarn', ['tsc', '--noEmit']);

    cleanNextDir();
    await run('yarn', ['build']);
    assertExportArtifacts(false);

    const port = await getPort();
    server = spawn('yarn', ['start', '-p', String(port)], { stdio: 'inherit', cwd: rootDir });
    process.on('exit', () => server?.kill());
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

    server.kill();
    await new Promise((resolve) => server.on('exit', resolve));
    server = undefined;
    cleanNextDir();

    const exportOutput = getOutputSetting({ NEXT_PUBLIC_STATIC_EXPORT: 'true' });
    if (exportOutput !== 'export') {
      throw new Error('Static export flag did not enable output: "export"');
    }

    await run('yarn', ['build'], {
      env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: 'true' },
    });
    assertExportArtifacts(true);

    console.log('✓ Static export build generated .next/export and export-detail.json');
    console.log('verify: PASS');
  } catch (err) {
    console.error('verify: FAIL');
    console.error(err);
    process.exit(1);
  } finally {
    server?.kill();
    cleanNextDir();
  }
})();

