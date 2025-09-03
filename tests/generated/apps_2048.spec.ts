import { test, expect } from '@playwright/test';

test('navigate to /apps/2048', async ({ page }) => {
  await page.goto('/apps/2048');
  await expect(page.getByRole('heading')).toBeVisible();
});
