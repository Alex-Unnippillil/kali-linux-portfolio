import { test, expect } from '@playwright/test';

test('loads home page', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.click('body');
  await page.screenshot({ path: testInfo.outputPath('home.png') });
  await expect(page.locator('main')).toBeVisible();
});
