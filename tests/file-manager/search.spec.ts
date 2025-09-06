import { test, expect } from '@playwright/test';

test.describe('File Manager search', () => {
  test('shows metadata and opens containing folder', async ({ page }) => {
    // Navigate directly to the file manager application
    await page.goto('/apps/file-explorer');

    // Enter a query in the search box
    await page.getByRole('textbox', { name: /search/i }).fill('README');
    await page.keyboard.press('Enter');

    // Ensure the first result displays path, size and modification time
    const firstResult = page.locator('[data-testid="search-result"]').first();
    await expect(firstResult.locator('[data-testid="path"]')).toBeVisible();
    await expect(firstResult.locator('[data-testid="size"]')).toBeVisible();
    await expect(firstResult.locator('[data-testid="mtime"]')).toBeVisible();

    // Invoke "Open containing folder" on the result
    await firstResult.getByRole('button', { name: /open containing folder/i }).click();

    // Verify focus moves to the file list for that folder
    await expect(page.locator('[data-testid="file-list"]')).toBeFocused();
  });
});
