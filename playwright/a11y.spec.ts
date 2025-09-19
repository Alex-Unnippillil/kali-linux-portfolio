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
  '/apps/chrome',
  '/apps/trash',
  '/apps/gedit',
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

test('desktop focus indicator follows accent token', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  const target = page.locator('button[aria-label="System status"]');
  await target.focus();
  const styles = await target.evaluate((el) => {
    const rootStyle = getComputedStyle(document.documentElement);
    const accentToken = (rootStyle.getPropertyValue('--focus-outline-color') || rootStyle.getPropertyValue('--color-focus-ring') || '#1793d1').trim();
    const toRgb = (value: string) => {
      const probe = document.createElement('div');
      probe.style.color = value;
      document.body.appendChild(probe);
      const rgb = getComputedStyle(probe).color;
      probe.remove();
      return rgb;
    };
    const accentRgb = toRgb(accentToken);
    const computed = getComputedStyle(el as HTMLElement);
    return {
      outlineColor: computed.outlineColor,
      outlineWidth: computed.outlineWidth,
      boxShadow: computed.boxShadow,
      accentRgb,
    };
  });

  expect(parseFloat(styles.outlineWidth)).toBeGreaterThanOrEqual(2);
  expect(styles.outlineColor).toBe(styles.accentRgb);
  expect(styles.boxShadow).not.toBe('none');
});
