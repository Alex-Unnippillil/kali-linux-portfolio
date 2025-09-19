import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import fs from 'fs/promises';
import waitOn from 'wait-on';
import { chromium } from 'playwright';

const runCommand = (cmd, args, { warnRegex } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['inherit', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      output += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
        return;
      }
      if (warnRegex && warnRegex.test(output)) {
        reject(new Error(`Warnings detected while running ${cmd} ${args.join(' ')}`));
        return;
      }
      resolve(output);
    });
  });

const getPort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

const warnRegex = /(^|\n)\s*(warn\s+-|Warning:)/i;
const tscWarnRegex = /(^|\n)\s*warning\s+TS/i;

async function createProfiles(page) {
  await page.evaluate(async () => {
    if (!('storage' in navigator) || typeof navigator.storage.getDirectory !== 'function') {
      throw new Error('OPFS not supported in this environment');
    }
    const dir = await navigator.storage.getDirectory();
    const write = async (deviceId, profile) => {
      const handle = await dir.getFileHandle(`${deviceId}.json`, { create: true });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(profile));
      await writable.close();
    };
    await write('alpha-device', {
      name: 'Alpha Device',
      services: [
        {
          uuid: 'service-alpha',
          characteristics: [{ uuid: 'char-alpha', value: 'alpha-value' }],
        },
      ],
    });
    await write('beta-device', {
      name: 'Beta Device',
      services: [
        {
          uuid: 'service-beta',
          characteristics: [{ uuid: 'char-beta', value: 'beta-value' }],
        },
      ],
    });
    const bc = new BroadcastChannel('ble-profiles');
    bc.postMessage('update');
    bc.close();
  });
}

async function exportProfile(page, deviceId, outFile) {
  const data = await page.evaluate(async (id) => {
    const dir = await navigator.storage.getDirectory();
    const handle = await dir.getFileHandle(`${id}.json`);
    const file = await handle.getFile();
    return await file.text();
  }, deviceId);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, data, 'utf8');
  return data;
}

async function importProfile(page, deviceId, rawData) {
  await page.evaluate(async ({ id, json }) => {
    const dir = await navigator.storage.getDirectory();
    const handle = await dir.getFileHandle(`${id}.json`, { create: true });
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
    const bc = new BroadcastChannel('ble-profiles');
    bc.postMessage('update');
    bc.close();
  }, { id: deviceId, json: rawData });
}

async function waitForProfiles(page) {
  await page.waitForSelector('#ble-sensor input[value="Alpha Device"]', {
    timeout: 5000,
  });
  await page.waitForSelector('#ble-sensor input[value="Imported Beta"]', {
    timeout: 5000,
  });
}

async function openBleSensor(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: 'ble-sensor' }));
  });
  await page.waitForSelector('#ble-sensor', { timeout: 5000 });
}

async function runSmokeNavigation(context, baseURL) {
  const routes = [
    '/apps/2048',
    '/apps/ascii-art',
    '/apps/autopsy',
    '/apps/beef',
    '/apps/blackjack',
    '/apps/calculator',
    '/apps/checkers',
    '/apps/connect-four',
    '/apps/contact',
    '/apps/converter',
    '/apps/figlet',
    '/apps/http',
    '/apps',
    '/apps/input-lab',
    '/apps/john',
    '/apps/kismet',
    '/apps/metasploit-post',
    '/apps/metasploit',
    '/apps/minesweeper',
    '/apps/nmap-nse',
    '/apps/password_generator',
    '/apps/phaser_matter',
    '/apps/pinball',
    '/apps/project-gallery',
    '/apps/qr',
    '/apps/settings',
    '/apps/simon',
    '/apps/sokoban',
    '/apps/solitaire',
    '/apps/spotify',
    '/apps/ssh',
    '/apps/sticky_notes',
    '/apps/timer_stopwatch',
    '/apps/tower-defense',
    '/apps/volatility',
    '/apps/vscode',
    '/apps/weather',
    '/apps/weather_widget',
    '/apps/wireshark',
    '/apps/word_search',
    '/apps/x',
  ];

  for (const route of routes) {
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
    if (!response || !response.ok()) {
      throw new Error(`Navigation to ${route} failed with ${response ? response.status() : 'no response'}`);
    }
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(`Console errors on ${route}: ${[...pageErrors, ...consoleErrors].join('\n')}`);
    }
    await page.close();
  }
}

async function main() {
  await runCommand('yarn', ['lint']);
  await runCommand('yarn', ['tsc', '--noEmit'], { warnRegex: tscWarnRegex });
  await runCommand('yarn', ['build'], { warnRegex });

  const port = await getPort();
  const server = spawn('yarn', ['start', '-p', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));

  const onExit = () => {
    if (!server.killed) {
      server.kill();
    }
  };
  const onSigint = () => {
    onExit();
    process.exit(1);
  };
  process.on('exit', onExit);
  process.on('SIGINT', onSigint);

  const baseURL = `http://localhost:${port}`;
  await waitOn({ resources: [baseURL], timeout: 60000 });

  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    await openBleSensor(page);
    await createProfiles(page);
    await page.waitForSelector('#ble-sensor input[value="Alpha Device"]', { timeout: 5000 });
    await page.waitForSelector('#ble-sensor input[value="Beta Device"]', { timeout: 5000 });

    const exportDir = path.join(process.cwd(), 'playwright', 'profiles');
    const exportedRaw = await exportProfile(page, 'alpha-device', path.join(exportDir, 'alpha-device.json'));
    const imported = JSON.stringify({ ...JSON.parse(exportedRaw), name: 'Imported Beta' });
    await importProfile(page, 'beta-device', imported);
    await waitForProfiles(page);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await openBleSensor(page);
    await waitForProfiles(page);

    await page.close();
    await runSmokeNavigation(context, baseURL);
    await context.close();
  } finally {
    process.off('exit', onExit);
    process.off('SIGINT', onSigint);
    if (browser) {
      await browser.close().catch(() => {});
    }
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
