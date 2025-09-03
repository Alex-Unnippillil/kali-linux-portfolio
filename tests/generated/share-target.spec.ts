import { test, expect } from '@playwright/test';

test('navigate to /share-target', async ({ page }) => {
  await page.goto('/share-target');
  await expect(page.getByRole('heading')).toBeVisible();
});
