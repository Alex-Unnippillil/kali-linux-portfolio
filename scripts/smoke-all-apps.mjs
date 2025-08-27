import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  const pagesDir = path.join(process.cwd(), 'pages', 'apps');
  const files = fs.readdirSync(pagesDir, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.(jsx?|tsx?)$/.test(d.name))
    .map((d) => d.name);

  const routes = files.map((file) => `/apps/${file.replace(/\.(jsx?|tsx?)$/, '')}`);

  for (const route of routes) {
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    console.log(`Visiting ${route}`);
    const response = await page.goto(`${BASE_URL}${route}`);
    if (!response || !response.ok()) {
      throw new Error(`Failed to load ${route}: ${response ? response.status() : 'no response'}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`Console errors on ${route}:\n${consoleErrors.join('\n')}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('All app routes loaded without console errors.');
})();
