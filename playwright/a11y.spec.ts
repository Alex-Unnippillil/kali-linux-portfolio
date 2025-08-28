import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const urls = ['/', '/apps'];

for (const path of urls) {
  test(`no critical accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(`http://localhost:3000${path}`);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(
      (v) => v.impact === 'critical',
    );
    expect(critical).toEqual([]);
  });
}
