import { test, expect } from '@playwright/test';

test('navigate to /apps/autopsy', async ({ page }) => {
  await page.goto('/apps/autopsy');
  await expect(page.getByRole('heading')).toBeVisible();
});
