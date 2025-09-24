import { test, expect } from '@playwright/test';
import routes from '../playwright/app-routes.json';

const appRoutes = (routes as string[]).filter((route) => route.startsWith('/apps/'));

for (const route of appRoutes) {
  test(`loads ${route}`, async ({ page }) => {
    await page.goto('/apps');
    await page.locator(`a[href="${route}"]`).click();
    await expect(page.locator('main')).toBeVisible();
  });
}
