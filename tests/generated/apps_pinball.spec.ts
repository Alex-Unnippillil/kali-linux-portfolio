import { test, expect } from '@playwright/test';

test('navigate to /apps/pinball', async ({ page }) => {
  await page.goto('/apps/pinball');
  await expect(page.getByRole('heading')).toBeVisible();
});
