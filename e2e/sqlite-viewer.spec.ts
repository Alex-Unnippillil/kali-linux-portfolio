import { test, expect } from '@playwright/test';

test('SQLite Viewer loads', async ({ page }) => {
  await page.goto('/apps/sqlite-viewer');
  await expect(page.locator('input[type="file"]')).toBeVisible();
});
