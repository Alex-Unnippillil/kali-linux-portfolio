import { expect, test } from '@playwright/test';

const routes = [
  { name: 'home', path: '/' },
  { name: 'apps', path: '/apps' },
  { name: 'profile', path: '/profile' },
];

test.describe('visual regression baselines', () => {
  for (const route of routes) {
    test(`captures ${route.name} route`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(250);
      await expect(page).toHaveScreenshot(`${route.name}.png`, {
        fullPage: true,
      });
    });
  }
});
