import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { AppRoute, buildAppRoute } from '../utils/routes';

const appDir = path.join(process.cwd(), 'pages', 'apps');

function getRoutes(dir: string, prefix = ''): AppRoute[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const routes: AppRoute[] = [];
  for (const entry of entries) {
    if (entry.isFile() && /\.(jsx?|tsx?)$/.test(entry.name)) {
      const rel = path.join(prefix, entry.name).replace(/\\/g, '/');
      const appId = rel.replace(/\.(jsx?|tsx?)$/, '');
      routes.push(buildAppRoute({ appId }));
    } else if (entry.isDirectory()) {
      routes.push(...getRoutes(path.join(dir, entry.name), path.join(prefix, entry.name)));
    }
  }
  return routes;
}

const APP_INDEX_ROUTE = buildAppRoute({ appId: 'index' });

const routes = getRoutes(appDir)
  .filter((r) => r !== APP_INDEX_ROUTE)
  .map((r) => r.replace(/\/index$/, ''));

for (const route of routes) {
  test(`loads ${route}`, async ({ page }) => {
    await page.goto('/apps');
    await page.locator(`a[href="${route}"]`).click();
    await expect(page.locator('main')).toBeVisible();
  });
}
