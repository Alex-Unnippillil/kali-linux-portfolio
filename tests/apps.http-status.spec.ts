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

const routes = Array.from(
  new Set(
    getRoutes(appDir)
      .filter((r) => r !== '/apps/index')
      .map((r) => r.replace(/\/index$/, '')),
  ),
);

const errorTexts = [
  'Unhandled Runtime Error',
  'Application error',
  'TypeError',
  'ReferenceError',
  'Internal Server Error',
  'This page could not be found',
];

for (const route of routes) {
  test(`${route} responds with 200 and no error text`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);

    const content = await page.content();
    for (const text of errorTexts) {
      expect(content).not.toContain(text);
    }
  });
}
