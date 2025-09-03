import { test, expect } from '@playwright/test';

test('navigate to /apps/volatility', async ({ page }) => {
  await page.goto('/apps/volatility');
  await expect(page.getByRole('heading')).toBeVisible();
});
