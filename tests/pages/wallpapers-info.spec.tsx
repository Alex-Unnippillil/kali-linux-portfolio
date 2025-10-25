import { test, expect } from '@playwright/test';

test('infobox mentions kali-wallpapers package with link', async ({ page }) => {
  await page.goto('/tools/kali-wallpapers/');
  const link = page.locator('aside #package-links a[href*="pkg.kali.org/pkg/kali-wallpapers"]');
  await expect(link).toBeVisible();
});
