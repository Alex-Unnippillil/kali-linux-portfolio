import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Maximum allowed accessibility violations by impact level
const thresholds: Record<string, number> = {
  critical: 0,
  serious: 0,
  // Allow a limited number of moderate/minor issues until they are fixed
  moderate: 10,
  minor: 50,
};

type ThemeVariant = {
  name: string;
  setup(page: Page): Promise<void> | void;
  verify?(page: Page): Promise<void> | void;
};

const themes: ThemeVariant[] = [
  {
    name: 'default',
    setup: async () => {},
  },
  {
    name: 'high-contrast',
    setup: async (page) => {
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem('high-contrast', 'true');
        } catch (error) {
          // Ignore storage errors when running in strict browsers/CI
        }
      });
    },
    verify: async (page) => {
      await page.waitForFunction(() =>
        document.documentElement.classList.contains('high-contrast'),
      );
    },
  },
];

const urls = [
  '/',
  '/apps',
  '/apps/chess',
  '/apps/sudoku',
  '/apps/youtube',
  // Additional resource-heavy apps
  '/apps/vscode',
  '/apps/spotify',
  '/apps/x',
  '/apps/firefox',
  '/apps/trash',
  '/apps/gedit',
  '/apps/todoist',
];

for (const path of urls) {
  for (const theme of themes) {
    test(`accessibility audit for ${path} (${theme.name})`, async ({ page }) => {
      await theme.setup(page);
      await page.goto(`http://localhost:3000${path}`, {
        waitUntil: 'networkidle',
      });

      if (theme.verify) {
        await theme.verify(page);
      }

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const counts = results.violations.reduce<Record<string, number>>(
        (acc, v) => {
          const impact = v.impact || 'minor';
          acc[impact] = (acc[impact] || 0) + 1;
          return acc;
        },
        {},
      );

      for (const [impact, max] of Object.entries(thresholds)) {
        const count = counts[impact] || 0;
        expect(
          count,
          `${path} (${theme.name}) has ${count} ${impact} violations (threshold ${max})`,
        ).toBeLessThanOrEqual(max);
      }
    });
  }
}
