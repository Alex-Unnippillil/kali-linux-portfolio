import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

(async () => {
  const browsers = [
    { name: 'chromium', type: chromium },
    { name: 'firefox', type: firefox },
    { name: 'webkit', type: webkit },
  ];

  const pagesDir = path.join(process.cwd(), 'pages', 'apps');
  const files = fs.readdirSync(pagesDir, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.(jsx?|tsx?)$/.test(d.name))
    .map((d) => d.name);

  const routes = files.map((file) => `/apps/${file.replace(/\.(jsx?|tsx?)$/, '')}`);

  let hadError = false;
  const results = [];

  for (const { name, type } of browsers) {
    const browser = await type.launch();
    const context = await browser.newContext();

    for (const route of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      console.log(`[${name}] Visiting ${route}`);
      let error = '';
      try {
        const response = await page.goto(`${BASE_URL}${route}`);
        if (!response || !response.ok()) {
          error = `HTTP ${response ? response.status() : 'no response'}`;
        } else if (consoleErrors.length > 0) {
          error = consoleErrors.join('\n');
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
