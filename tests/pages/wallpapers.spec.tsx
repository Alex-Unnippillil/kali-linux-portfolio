import { test, expect } from '@playwright/test';

// Test that switching wallpapers applies immediately and persists after reload
// We use one of the non-default wallpapers to avoid relying on previous state

const targetWallpaperLabel = 'Select wallpaper 3';
const targetWallpaperId = 'wall-3';

// Helper to locate the preview element showing current wallpaper
function previewLocator(page: import('@playwright/test').Page) {
  return page.locator('div[style*="/wallpapers/"]').first();
}

test('switch wallpapers and ensure choice applies instantly and persists', async ({ page }) => {
  // Open settings page
  await page.goto('/apps/settings');

  // Choose the target wallpaper
  const option = page.getByRole('button', { name: targetWallpaperLabel });
  await option.click();

  // Verify the selection changed immediately
  await expect(option).toHaveAttribute('aria-pressed', 'true');
  await expect(previewLocator(page)).toHaveAttribute('style', new RegExp(`wallpapers/${targetWallpaperId}\.webp`));

  // Allow time for persistence before reloading
  await page.waitForTimeout(1000);

  // Reload the page to confirm the choice persists
  await page.reload();
  await expect(previewLocator(page)).toHaveAttribute('style', new RegExp(`wallpapers/${targetWallpaperId}\.webp`));

  // Navigate to the home page and confirm wallpaper is applied globally
  await page.goto('/');
  const bg = page.locator('img[src*="/wallpapers/"]');
  await expect(bg).toHaveAttribute('src', new RegExp(`${targetWallpaperId}\.webp`));

  // Reload home page to ensure persistence across reloads
  await page.reload();
  await expect(page.locator('img[src*="/wallpapers/"]')).toHaveAttribute('src', new RegExp(`${targetWallpaperId}\.webp`));
});
