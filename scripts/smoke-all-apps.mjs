import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs';
import path from 'path';
import './generate-smoke-list.mjs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const routesPath = path.join(process.cwd(), 'playwright', 'app-routes.json');

const loadRoutes = () => {
  try {
    const raw = fs.readFileSync(routesPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Expected an array of routes');
    }
    return parsed;
  } catch (error) {
    console.error('Unable to read generated app routes.');
    console.error('Run `node scripts/generate-smoke-list.mjs` to regenerate the list.');
    throw error;
  }
};

(async () => {
  const browsers = [
    { name: 'chromium', type: chromium },
    { name: 'firefox', type: firefox },
    { name: 'webkit', type: webkit },
  ];

  const routes = ['/apps', ...loadRoutes()];

  let hadError = false;
  const results = [];

  for (const { name, type } of browsers) {
    const browser = await type.launch();
    const context = await browser.newContext();

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
      console.log(`[${name}] Visiting ${route}`);
      let error = '';
      try {
        const response = await page.goto(`${BASE_URL}${route}`);
        if (!response || !response.ok()) {
          error = `HTTP ${response ? response.status() : 'no response'}`;
        } else if (consoleErrors.length > 0 || pageErrors.length > 0) {
          error = [...pageErrors, ...consoleErrors].join('\n');
        }
      } catch (err) {
        error = err.message;
      }
      if (error) {
        hadError = true;
        console.error(`[${name}] Error on ${route}: ${error}`);
      }
      results.push({ browser: name, route, error });
      await page.close();
    }

    await browser.close();
  }

  if (hadError) {
    console.error('Completed with errors');
  } else {
    console.log('All app routes loaded without console errors.');
  }

  // Write results to log file if TEST_LOG env variable provided
  if (process.env.SMOKE_LOG) {
    fs.writeFileSync(process.env.SMOKE_LOG, JSON.stringify(results, null, 2));
  }
})();
