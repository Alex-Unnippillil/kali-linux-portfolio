import { test, expect } from '@playwright/test';

test('WSL prep page provides setup resources and WSL1/WSL2 note', async ({ page }) => {
  await page.goto('/wsl-prep');

  await expect(
    page.locator('a[href*="learn.microsoft.com/windows/wsl"]')
  ).toBeVisible();
  await expect(
    page.locator('a[href*="kali.org/docs/wsl"]')
  ).toBeVisible();

  await expect(page.getByText(/WSL1.*WSL2/i)).toBeVisible();
});
