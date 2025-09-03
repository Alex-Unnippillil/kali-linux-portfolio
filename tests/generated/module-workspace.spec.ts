import { test, expect } from '@playwright/test';

test('navigate to /module-workspace', async ({ page }) => {
  await page.goto('/module-workspace');
  await expect(page.getByRole('heading')).toBeVisible();
});
