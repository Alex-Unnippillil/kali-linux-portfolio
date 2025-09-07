import { test, expect } from '@playwright/test';

// Ensure window snapping via keyboard works and can be undone.
test.describe('window snapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('nav [aria-label="Show Applications"]').click();
    await page.locator('#app-terminal').click();
    await page.locator('[data-app-id="terminal"]').focus();
  });

  test('snap left and restore with Alt+ArrowDown', async ({ page }) => {
    const win = page.locator('[data-app-id="terminal"]');

    await page.keyboard.down('Alt');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.up('Alt');

    const snapped = await win.getAttribute('style');
    expect(snapped).toContain('left: 0');
    expect(snapped).toContain('width: 50%');

    await page.keyboard.down('Alt');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.up('Alt');

    const restored = await win.getAttribute('style');
    expect(restored).not.toContain('width: 50%');
  });
});
