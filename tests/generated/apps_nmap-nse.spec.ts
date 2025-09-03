import { test, expect } from '@playwright/test';

test('navigate to /apps/nmap-nse', async ({ page }) => {
  await page.goto('/apps/nmap-nse');
  await expect(page.getByRole('heading')).toBeVisible();
});
