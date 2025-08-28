import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

function getRoutes(dir: string, base = ''): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const routes: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('_') || entry.name === 'api') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...getRoutes(fullPath, path.join(base, entry.name)));
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      let routePath = path.join(base, entry.name.replace(/\.(jsx?|tsx?)$/, ''));
      if (routePath === 'index') routePath = '';
      if (routePath.endsWith('/index')) routePath = routePath.replace(/\/index$/, '');
      routePath = routePath.split(path.sep).join('/');
      routes.push(routePath ? `/${routePath}` : '/');
    }
  }
  return routes;
}

const urls = getRoutes(path.join(__dirname, '..', 'pages'));

for (const url of urls) {
  test(`no critical accessibility violations on ${url}`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toEqual([]);
  });
}
