import { test, expect } from '@playwright/test';

test.describe('ARM images table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/arm-images');
  });

  const cases = [
    { model: 'Pi 4', href: 'https://www.kali.org/docs/arm/raspberry-pi-4/' },
    { model: 'Pi 5', href: 'https://www.kali.org/docs/arm/raspberry-pi-5/' },
  ];

  for (const { model, href } of cases) {
    test(`contains ${model} row with docs link`, async ({ page }) => {
      const row = page.locator('table tbody tr', { hasText: model });
      await expect(row).toBeVisible();
      await expect(row.locator(`a[href="${href}"]`)).toBeVisible();
    });
  }
});
