import { test, expect } from '@playwright/test';

test('navigate to /qr/vcard', async ({ page }) => {
  await page.goto('/qr/vcard');
  await expect(page.getByRole('heading')).toBeVisible();
});
