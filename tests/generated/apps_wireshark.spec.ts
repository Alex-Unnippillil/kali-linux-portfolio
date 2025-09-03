import { test, expect } from '@playwright/test';

test('navigate to /apps/wireshark', async ({ page }) => {
  await page.goto('/apps/wireshark');
  await expect(page.getByRole('heading')).toBeVisible();
});
