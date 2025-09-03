import { test, expect } from '@playwright/test';

test('navigate to /apps/qr', async ({ page }) => {
  await page.goto('/apps/qr');
  await expect(page.getByRole('heading')).toBeVisible();
});
