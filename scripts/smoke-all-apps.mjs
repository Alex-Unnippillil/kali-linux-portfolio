import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MAX_APPS = 20;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeAttribute(value) {
  return value.replace(/"/g, '\\"');
}

function createCssIdSelector(id) {
  return `[id="${escapeAttribute(id)}"]`;
}

function createAppIconSelector(id) {
  return `[data-app-id="${escapeAttribute(id)}"]`;
}

async function loadAppConfig() {
  const configPath = path.join(__dirname, '..', 'apps.config.js');
  const raw = await fs.promises.readFile(configPath, 'utf8');

  let stubCode = '';
  const importRegex = /^import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"];?$/gm;
  const stripped = raw.replace(importRegex, (_, identifiers) => {
    const names = identifiers
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    for (const name of names) {
      if (name === 'createDynamicApp') {
        stubCode +=
          'const createDynamicApp = (...args) => ({ __stub: "dynamic", args });\n';
      } else if (name === 'createDisplay') {
        stubCode +=
          'const createDisplay = (component) => { const fn = (...args) => ({ component, args }); fn.prefetch = () => {}; return fn; };\n';
      } else {
        stubCode += `const ${name} = (...args) => ({ __stub: '${name}', args });\n`;
      }
    }

    return '';
  });

  const transformed = `${stubCode}\n${stripped}`
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+default\s+/g, 'return ');

  const script = new vm.Script(`(() => {\n${transformed}\n})()`);
  const context = vm.createContext({ console });
  const result = script.runInContext(context);

  if (!Array.isArray(result)) {
    throw new Error('Failed to load apps from config');
  }

  const seen = new Set();
  const apps = [];
  for (const app of result) {
    if (!app || typeof app !== 'object') continue;
    if (app.disabled) continue;
    if (seen.has(app.id)) continue;
    seen.add(app.id);
    apps.push({ id: app.id, title: app.title || app.id });
    if (apps.length >= MAX_APPS) break;
  }

  return apps;
}

async function ensureBootScreenCleared(page) {
  await page.waitForLoadState('domcontentloaded');
  const launcherButton = page.getByRole('button', { name: 'Applications' });
  await launcherButton.waitFor({ state: 'visible', timeout: 15000 });
  const handle = await launcherButton.elementHandle();
  if (!handle) {
    throw new Error('Launcher button unavailable');
  }
  await page.waitForFunction((button) => {
    if (!button) return false;
    const rect = button.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, handle);
  await handle.dispose();
  return launcherButton;
}

async function openAppViaLauncher(page, app) {
  const launcherButton = await ensureBootScreenCleared(page);
  await launcherButton.click();

  const searchInput = page.getByPlaceholder('Search');
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });
  await searchInput.fill('');
  await searchInput.fill(app.title);

  const iconLocator = page.locator(createAppIconSelector(app.id));
  await iconLocator.first().waitFor({ state: 'visible', timeout: 5000 });
  await iconLocator.first().dblclick();

  const windowLocator = page.locator(createCssIdSelector(app.id));
  await windowLocator.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);
}

(async () => {
  const apps = await loadAppConfig();
  const browsers = [
    { name: 'chromium', type: chromium },
    { name: 'firefox', type: firefox },
    { name: 'webkit', type: webkit },
  ];

  let hadError = false;
  const results = [];

  for (const { name, type } of browsers) {
    const browser = await type.launch();

    for (const app of apps) {
      const context = await browser.newContext();
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

      console.log(`[${name}] Opening ${app.id}`);
      let error = '';

      try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await openAppViaLauncher(page, app);

        if (consoleErrors.length > 0 || pageErrors.length > 0) {
          error = [...pageErrors, ...consoleErrors].join('\n');
        }
      } catch (err) {
        error = err.message;
      }

      if (error) {
        hadError = true;
        console.error(`[${name}] Error on ${app.id}: ${error}`);
      }
      results.push({ browser: name, app: app.id, error });

      await page.close();
      await context.close();
    }

    await browser.close();
  }

  if (hadError) {
    console.error('Completed with errors');
  } else {
    console.log('All launcher apps loaded without console errors.');
  }

  if (process.env.SMOKE_LOG) {
    fs.writeFileSync(process.env.SMOKE_LOG, JSON.stringify(results, null, 2));
  }
})();
