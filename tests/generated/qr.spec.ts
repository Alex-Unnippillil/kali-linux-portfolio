import { test, expect } from '@playwright/test';

test('navigate to /qr', async ({ page }) => {
  await page.goto('/qr');
  await expect(page.getByRole('heading')).toBeVisible();
});
