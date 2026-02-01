import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Maximum allowed accessibility violations by impact level
const thresholds: Record<string, number> = {
  critical: 0,
  serious: 0,
  // Allow a limited number of moderate/minor issues until they are fixed
  moderate: 10,
  minor: 50,
};

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
  '/apps/todoist',
];

for (const path of urls) {
  test(`accessibility audit for ${path}`, async ({ page }) => {
    await page.goto(`http://localhost:3000${path}`);
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
        `${path} has ${count} ${impact} violations (threshold ${max})`,
      ).toBeLessThanOrEqual(max);
    }
  });
}
