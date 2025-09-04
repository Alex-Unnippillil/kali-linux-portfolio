import { test, expect } from '@playwright/test';

// Basic navigation smoke test covering home -> apps -> Nessus app
// to ensure primary routes load correctly.
test('navigate from home to Nessus app', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: /Apps/i }).click();
  await expect(page).toHaveURL(/\/apps/);

  await page.locator('a[href="/apps/nessus"]').click();
  await expect(page).toHaveURL(/\/apps\/nessus/);
});
