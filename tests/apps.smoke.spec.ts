import { test, expect, type ConsoleMessage } from '@playwright/test';
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
  test(`loads ${route}`, async ({ page }) => {
    const consoleMessages: string[] = [];
    const pageErrors: string[] = [];

    const consoleListener = (message: ConsoleMessage) => {
      const type = message.type();
      if (type === 'warning' || type === 'error') {
        const location = message.location();
        const locationSuffix = location.url
          ? ` (${location.url}${
              location.lineNumber !== undefined ? `:${location.lineNumber}` : ''
            })`
          : '';
        consoleMessages.push(`${type.toUpperCase()}: ${message.text()}${locationSuffix}`);
      }
    };

    const errorListener = (error: Error) => {
      pageErrors.push(`PAGE ERROR: ${error.message}`);
    };

    page.on('console', consoleListener);
    page.on('pageerror', errorListener);

    try {
      await page.goto('/apps');
      await page.locator(`a[href="${route}"]`).click();
      await expect(page.locator('main')).toBeVisible();

      if (pageErrors.length > 0 || consoleMessages.length > 0) {
        const issues = [...pageErrors, ...consoleMessages].join('\n');
        throw new Error(
          `Console warnings or errors detected while loading ${route}:\n${issues}`
        );
      }
    } finally {
      page.off('console', consoleListener);
      page.off('pageerror', errorListener);
    }
  });
}
