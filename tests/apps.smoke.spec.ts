import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const appDir = path.join(process.cwd(), 'pages', 'apps');

function getRoutes(dir: string, prefix = ''): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const routes: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && /\.(jsx?|tsx?)$/.test(entry.name)) {
      const rel = path.join(prefix, entry.name).replace(/\\/g, '/');
      routes.push('/apps/' + rel.replace(/\.(jsx?|tsx?)$/, ''));
    } else if (entry.isDirectory()) {
      routes.push(...getRoutes(path.join(dir, entry.name), path.join(prefix, entry.name)));
    }
  }
  return routes;
}

const routes = getRoutes(appDir)
  .filter((r) => r !== '/apps/index')
  .map((r) => r.replace(/\/index$/, ''));

for (const route of routes) {
  test(`loads ${route}`, async ({ page }, testInfo) => {
    await page.goto(route);

    // perform a simple action on the page
    await page.click('body');

    // capture a screenshot for documentation
    const file = route.replace(/\//g, '_') + '.png';
    await page.screenshot({ path: testInfo.outputPath(file) });

    await expect(page.locator('main')).toBeVisible();
  });
}
