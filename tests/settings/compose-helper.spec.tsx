import { test, expect } from '@playwright/test';

// This test verifies the "Compose Helper" dialog within the settings app.
// It searches for "Compose" using the settings search box, opens the helper
// dialog and ensures each sequence can be copied to the clipboard.

test.describe('Compose Helper', () => {
  test('shows sequences and copies them to clipboard', async ({ page }) => {
    // Open the settings app
    await page.goto('/apps/settings');

    // Search for "Compose" to open the helper dialog
    const searchBox = page.locator('input[placeholder*="Search" i]');
    await searchBox.fill('Compose');
    await searchBox.press('Enter');

    const dialog = page.getByRole('dialog', { name: /compose helper/i });
    await expect(dialog).toBeVisible();

    const items = dialog.getByRole('listitem');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const text = (await item.textContent())?.trim() || '';
      await item.getByRole('button', { name: /copy/i }).click();
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      expect(clip.trim()).toBe(text);
    }
  });
});
