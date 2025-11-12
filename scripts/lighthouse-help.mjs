import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import process from 'node:process';
import waitOn from 'wait-on';
import chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const DEFAULT_CONTEXTS = ['apps', 'desktop', 'taskbar', 'windows', 'shortcuts'];
const DEFAULT_PORT = parseInt(process.env.LIGHTHOUSE_PORT ?? '4010', 10);
const HELP_CONTEXTS = process.env.LIGHTHOUSE_HELP_CONTEXTS;
const EXTRA_ROUTES = process.env.LIGHTHOUSE_HELP_ROUTES;
const BASE_URL = process.env.LIGHTHOUSE_BASE_URL ?? `http://localhost:${DEFAULT_PORT}`;

const thresholds = {
  performance: 95,
  accessibility: 95,
  'best-practices': 95,
  seo: 95,
};

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRoute(route) {
  if (!route.startsWith('/')) {
    return `/${route}`;
  }
  return route;
}

const contexts = HELP_CONTEXTS ? parseList(HELP_CONTEXTS) : DEFAULT_CONTEXTS;
const extraRoutes = EXTRA_ROUTES ? parseList(EXTRA_ROUTES) : [];

const routeSet = new Set(['/help']);
for (const context of contexts) {
  const trimmed = context.replace(/^\//, '');
  if (trimmed) {
    routeSet.add(`/help/${trimmed}`);
  }
}
for (const route of extraRoutes) {
  routeSet.add(normalizeRoute(route));
}

const routes = Array.from(routeSet).map((path) => new URL(path, BASE_URL).toString());

if (Number.isNaN(DEFAULT_PORT) || DEFAULT_PORT <= 0) {
  throw new Error(`Invalid port provided: ${process.env.LIGHTHOUSE_PORT}`);
}

let shuttingDown = false;
let serverExited = false;

const server = spawn('yarn', ['start'], {
  env: { ...process.env, PORT: String(DEFAULT_PORT), NODE_ENV: 'production' },
  stdio: 'inherit',
});

server.on('exit', (code, signal) => {
  serverExited = true;
  if (!shuttingDown && (code ?? 0) !== 0) {
    console.error(`next start exited unexpectedly with code ${code ?? 'null'}${signal ? ` (signal ${signal})` : ''}`);
    process.exitCode = process.exitCode || 1;
  }
});

server.on('error', (error) => {
  console.error('Failed to launch next start:', error);
});

async function stopServer() {
  if (serverExited) return;
  shuttingDown = true;
  const exitPromise = once(server, 'exit').catch(() => {});
  server.kill('SIGTERM');
  const timedOut = await Promise.race([
    exitPromise.then(() => false),
    delay(5000).then(() => true),
  ]);
  if (timedOut && !serverExited) {
    server.kill('SIGKILL');
    await exitPromise;
  } else {
    await exitPromise;
  }
}

async function run() {
  const resources = [`http-get://127.0.0.1:${DEFAULT_PORT}/`];
  try {
    console.log(`Waiting for Next.js to listen on port ${DEFAULT_PORT}...`);
    await waitOn({ resources, timeout: 60000, interval: 500, validateStatus: (status) => status < 500 });
  } catch (error) {
    throw new Error(`Timed out waiting for Next.js to start on port ${DEFAULT_PORT}: ${error.message ?? error}`);
  }

  console.log('Launching headless Chrome for Lighthouse audits...');
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
  });

  const categories = Object.keys(thresholds);
  const options = {
    port: chrome.port,
    logLevel: 'warn',
    output: 'json',
    onlyCategories: categories,
  };
  const config = {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
    },
  };

  let hasFailures = false;

  try {
    for (const url of routes) {
      console.log(`\nAuditing ${url}`);
      try {
        const result = await lighthouse(url, options, config);
        const { categories: reportCategories } = result.lhr;

        for (const [key, minimum] of Object.entries(thresholds)) {
          const category = reportCategories[key];
          if (!category) {
            console.error(`  ✖ Category '${key}' missing from Lighthouse report.`);
            hasFailures = true;
            continue;
          }
          const score = Math.round(((category.score ?? 0) * 1000)) / 10;
          const meets = score >= minimum;
          const status = meets ? '✔' : '✖';
          console.log(`  ${status} ${key.padEnd(16)} ${score.toFixed(1)} (requires ≥ ${minimum})`);
          if (!meets) {
            hasFailures = true;
          }
        }
      } catch (error) {
        hasFailures = true;
        console.error(`  ✖ Lighthouse run failed: ${error.message ?? error}`);
      }
    }
  } finally {
    await chrome.kill();
  }

  if (hasFailures) {
    throw new Error('One or more help routes failed Lighthouse thresholds.');
  }

  console.log('\nAll help routes meet Lighthouse thresholds.');
}

run()
  .catch((error) => {
    console.error('\nLighthouse help audit failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopServer();
  });
