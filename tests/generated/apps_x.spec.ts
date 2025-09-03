import { test, expect } from '@playwright/test';

test('navigate to /apps/x', async ({ page }) => {
  await page.goto('/apps/x');
  await expect(page.getByRole('heading')).toBeVisible();
});
