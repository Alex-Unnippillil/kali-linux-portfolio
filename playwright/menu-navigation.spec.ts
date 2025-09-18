import { test, expect } from '@playwright/test';

test.describe('Nested context menu keyboard navigation', () => {
  test('opens, traverses and selects submenu items with keyboard only', async ({ page }) => {
    await page.goto('/apps/menu-demo');

    const target = page.getByTestId('menu-target');
    await target.focus();

    await page.keyboard.press('Shift+F10');

    const rootMenu = page.locator('[role="menu"]').first();
    await expect(rootMenu).toBeVisible();

    // Move to "Share" which has a submenu
    await page.keyboard.press('ArrowDown');
    const shareItem = page.locator('[data-path="1"]');
    await expect(shareItem).toBeFocused();

    // Open the submenu with ArrowRight and ensure the first child gains focus
    await page.keyboard.press('ArrowRight');
    const emailItem = page.locator('[data-path="1-0"]');
    await expect(emailItem).toBeFocused();

    // Move to the nested "Export" item and open its submenu
    await page.keyboard.press('ArrowDown');
    const exportItem = page.locator('[data-path="1-1"]');
    await expect(exportItem).toBeFocused();
    await page.keyboard.press('ArrowRight');
    const exportPngItem = page.locator('[data-path="1-1-0"]');
    await expect(exportPngItem).toBeFocused();

    // Go back to the parent submenu using ArrowLeft
    await page.keyboard.press('ArrowLeft');
    await expect(exportItem).toBeFocused();

    // Open the nested submenu again and activate an option
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    const exportPdfItem = page.locator('[data-path="1-1-1"]');
    await expect(exportPdfItem).toBeFocused();
    await page.keyboard.press('Enter');

    // Menu should close and the selection text should update
    await expect(rootMenu).toBeHidden();
    await expect(page.getByTestId('selection')).toContainText('Export as PDF');
  });
});

