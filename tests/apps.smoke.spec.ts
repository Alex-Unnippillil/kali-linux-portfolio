import { test, expect } from './fixtures';
import type { ConsoleMessageExpectationOptions } from './fixtures';
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

const consoleExpectationsByRoute: Partial<Record<string, ConsoleMessageExpectationOptions[]>> = {
  '/apps/sticky_notes': [
    {
      type: 'error',
      message: 'Sticky notes DB upgrade blocked',
      optional: true,
    },
    {
      type: 'warning',
      message: 'Waiting for other tabs to close the Sticky notes DB',
      optional: true,
    },
  ],
  '/apps/timer_stopwatch': [
    {
      type: 'error',
      regex: /^AudioContext not supported/,
      description: 'Headless environments may not expose Web Audio APIs',
      optional: true,
    },
  ],
  '/apps/volatility': [
    {
      type: 'warning',
      regex: /Plugin .* requires Volatility /,
      description: 'Volatility plugin compatibility warnings are informational',
      optional: true,
    },
  ],
};

for (const route of routes) {
  test(`loads ${route}`, async ({ page, expectConsoleMessage }) => {
    const expectations = consoleExpectationsByRoute[route] ?? [];
    for (const expectation of expectations) {
      expectConsoleMessage(expectation);
    }

    await page.goto('/apps');
    await page.locator(`a[href="${route}"]`).click();
    await expect(page.locator('main')).toBeVisible();
  });
}
