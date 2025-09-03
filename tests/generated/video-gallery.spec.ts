import { test, expect } from '@playwright/test';

test('navigate to /video-gallery', async ({ page }) => {
  await page.goto('/video-gallery');
  await expect(page.getByRole('heading')).toBeVisible();
});
