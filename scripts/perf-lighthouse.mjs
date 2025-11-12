import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const lhciCli = require.resolve('@lhci/cli/src/cli.js');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const rcPath = path.join(rootDir, '.lighthouserc.cjs');
const playwrightCache = path.join(rootDir, 'node_modules', '.cache', 'ms-playwright');
const playwrightDepsSentinel = path.join(playwrightCache, '.deps-installed');

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      ...options,
    });

    child.on('error', reject);

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });

const chromiumExecutableForPlatform = (baseDir) => {
  if (process.platform === 'win32') {
    const candidate = path.join(baseDir, 'chrome-win', 'chrome.exe');
    return fs.existsSync(candidate) ? candidate : null;
  }

  if (process.platform === 'darwin') {
    const candidate = path.join(
      baseDir,
      'chrome-mac',
      'Chromium.app',
      'Contents',
      'MacOS',
      'Chromium',
    );
    return fs.existsSync(candidate) ? candidate : null;
  }

  const candidate = path.join(baseDir, 'chrome-linux', 'chrome');
  return fs.existsSync(candidate) ? candidate : null;
};

const browserRootCandidates = () => {
  const candidates = [];
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
    candidates.push(process.env.PLAYWRIGHT_BROWSERS_PATH);
  }
  candidates.push(playwrightCache);

  const homeDir = process.env.HOME ?? os.homedir();
  if (homeDir) {
    candidates.push(path.join(homeDir, '.cache', 'ms-playwright'));
  }

  return candidates;
};

const findPlaywrightChromium = () => {
  for (const candidateRoot of browserRootCandidates()) {
    if (!candidateRoot || !fs.existsSync(candidateRoot)) {
      continue;
    }

    const entries = fs
      .readdirSync(candidateRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium-'))
      .sort((a, b) => b.name.localeCompare(a.name));

    for (const entry of entries) {
      const executable = chromiumExecutableForPlatform(path.join(candidateRoot, entry.name));
      if (executable) {
        return executable;
      }
    }
  }

  return null;
};

const ensureChromiumExecutable = async () => {
  if (process.env.LHCI_CHROME_PATH) {
    return process.env.LHCI_CHROME_PATH;
  }

  let executable = findPlaywrightChromium();
  const hasDepsSentinel = fs.existsSync(playwrightDepsSentinel);
  const needsInstall = !executable || (process.platform === 'linux' && !hasDepsSentinel);

  if (needsInstall) {
    console.log('Installing Playwright Chromium for Lighthouse...');
    await run('yarn', ['playwright', 'install', '--with-deps', 'chromium'], {
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: playwrightCache,
      },
    });

    executable = findPlaywrightChromium();
    if (executable) {
      fs.mkdirSync(path.dirname(playwrightDepsSentinel), { recursive: true });
      fs.writeFileSync(playwrightDepsSentinel, '');
    }
  }

  if (executable) {
    return executable;
  }

  throw new Error(
    'Unable to locate a Chromium executable. Install Chrome manually or set LHCI_CHROME_PATH.',
  );
};

(async () => {
  try {
    if (process.env.SKIP_LHCI_BUILD === '1') {
      console.log('Skipping build step (SKIP_LHCI_BUILD=1).');
    } else {
      console.log('Building Next.js app before Lighthouse run...');
      await run('yarn', ['build']);
    }

    console.log('Running Lighthouse CI with performance budgets...');
    const env = {
      ...process.env,
      LHCI_BUILD_CONTEXT__CURRENT_BRANCH:
        process.env.GITHUB_HEAD_REF ?? process.env.BRANCH_NAME ?? process.env.GIT_BRANCH ?? 'local',
    };

    const chromiumExecutable = await ensureChromiumExecutable();
    const wrapperPath = path.join(playwrightCache, 'lhci-chrome.sh');
    const wrapperContents = `#!/usr/bin/env bash\n"${chromiumExecutable}" --no-sandbox --headless=new "$@"\n`;
    fs.mkdirSync(playwrightCache, { recursive: true });
    fs.writeFileSync(wrapperPath, wrapperContents, { mode: 0o755 });

    env.LHCI_CHROME_PATH = env.LHCI_CHROME_PATH ?? wrapperPath;

    await run('node', [lhciCli, 'autorun', '--rc-file', rcPath], { env });

    console.log('Lighthouse checks completed. Reports saved to .lighthouseci/.');
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
})();
