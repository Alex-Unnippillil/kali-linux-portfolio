import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/apps'];

for (const route of routes) {
  test(`kali theme has no AA contrast issues on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.locator('html').evaluate((el) => el.setAttribute('data-theme', 'kali'));
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .withTags(['wcag2aa'])
      .analyze();
    expect(results.violations).toHaveLength(0);
  });
}
