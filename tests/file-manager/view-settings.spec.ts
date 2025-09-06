import { test, expect } from '@playwright/test';

test.describe('file manager view settings', () => {
  test('remembers folder-specific view preferences', async ({ page }) => {
    await page.goto('/apps/files');

    // open a folder and change its view
    await page.locator('text=Documents').click();
    await page.locator('[aria-label="List view"]').click();

    // navigate away
    await page.locator('[aria-label="Back"]').click();

    // open a different folder to ensure it retains default view
    await page.locator('text=Downloads').click();
    await expect(page.locator('[aria-label="Icon view"].active')).toBeVisible();
    await page.locator('[aria-label="Back"]').click();

    // return to the original folder and verify the custom view persists
    await page.locator('text=Documents').click();
    await expect(page.locator('[aria-label="List view"].active')).toBeVisible();
  });
});
