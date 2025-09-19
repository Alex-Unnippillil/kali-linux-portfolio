import { spawn } from 'node:child_process';
import net from 'node:net';
import { once } from 'node:events';
import waitOn from 'wait-on';

const yarnCmd = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
const baseEnv = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
  CI: process.env.CI ?? '1',
};

const warningPattern = /(?:^|\s)warn(?:ing|ings)?(?=\s|:|-|\(|\.|,)/i;
const ansiPattern = /\u001b\[[0-9;]*m/g;
const yarnCodePattern = /(?:^|\s)YN(\d{4}):/i;

const stripAnsi = (value) => value.replace(ansiPattern, '');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkForWarnings = (label, output) => {
  const sanitized = stripAnsi(output);
  const lines = sanitized.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const yarnMatch = trimmed.match(yarnCodePattern);
    if (yarnMatch && yarnMatch[1] !== '0000') {
      throw new Error(`${label} emitted a warning: ${trimmed}`);
    }
    if (warningPattern.test(trimmed)) {
      throw new Error(`${label} emitted a warning: ${trimmed}`);
    }
  }
};

const runYarnCommand = (label, args, options = {}) =>
  new Promise((resolve, reject) => {
    console.log(`\n▶ ${label}`);

    const child = spawn(yarnCmd, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...baseEnv, ...options.env },
      cwd: options.cwd ?? process.cwd(),
    });

    let combined = '';

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      combined += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      combined += chunk.toString();
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${label} failed with exit code ${code}`));
        return;
      }

      try {
        if (options.checkWarnings !== false) {
          checkForWarnings(label, combined);
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });

const getOpenPort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });

const ensurePreviewServer = async () => {
  const port = await getOpenPort();
  console.log(`\n▶ yarn start (preview) on port ${port}`);

  const server = spawn(yarnCmd, ['start', '-p', String(port)], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...baseEnv },
  });

  let combined = '';
  server.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
    combined += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
    combined += chunk.toString();
  });
  let closed = false;
  const closePromise = once(server, 'close').then((result) => {
    closed = true;
    return result;
  });

  try {
    const readyPromise = waitOn({ resources: [`http://127.0.0.1:${port}`], timeout: 60000 });
    const errorPromise = once(server, 'error').then(([err]) => {
      throw err;
    });

    await Promise.race([readyPromise, errorPromise]);
    const response = await fetch(`http://127.0.0.1:${port}`);
    if (!response.ok) {
      throw new Error(`Preview responded with status ${response.status}`);
    }
    console.log(`Preview responded with ${response.status} ${response.statusText}`);
  } finally {
    if (server.pid) {
      for (const signal of ['SIGINT', 'SIGTERM']) {
        if (closed || server.exitCode !== null || server.signalCode !== null) {
          break;
        }
        try {
          server.kill(signal);
        } catch (err) {
          if (err?.code !== 'ESRCH') {
            throw err;
          }
        }
        await Promise.race([closePromise, delay(5000)]);
      }

      if (!closed && server.exitCode === null && server.signalCode === null) {
        console.warn('Preview did not exit after SIGTERM, sending SIGKILL.');
        try {
          server.kill('SIGKILL');
        } catch (err) {
          if (err?.code !== 'ESRCH') {
            throw err;
          }
        }
        await closePromise;
      }
    }
    server.removeAllListeners('error');
  }

  checkForWarnings('yarn start', combined);
};

const main = async () => {
  await runYarnCommand('yarn install --immutable', ['install', '--immutable'], { checkWarnings: false });
  await runYarnCommand('yarn build', ['build']);
  await ensurePreviewServer();

  console.log('\n✅ verify:fresh complete — no warnings detected.');
};

main().catch((err) => {
  console.error('\n❌ verify:fresh failed');
  console.error(err);
  process.exit(1);
});
