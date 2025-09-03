import { test, expect } from '@playwright/test';

test('navigate to /apps/settings', async ({ page }) => {
  await page.goto('/apps/settings');
  await expect(page.getByRole('heading')).toBeVisible();
});
