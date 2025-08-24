import { test, expect } from '@playwright/test';

test('PCAP Viewer loads', async ({ page }) => {
  await page.goto('/apps/pcap-viewer');
  await expect(page.locator('input[type="file"]')).toBeVisible();
});
