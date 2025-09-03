import { test, expect } from '@playwright/test';

test('navigate to /apps/calculator', async ({ page }) => {
  await page.goto('/apps/calculator');
  await expect(page.getByRole('heading')).toBeVisible();
});
