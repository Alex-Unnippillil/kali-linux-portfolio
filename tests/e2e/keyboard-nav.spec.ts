import { test, expect } from '@playwright/test';

// Validate basic keyboard navigation inside a window.
test('tab moves focus to window controls and back', async ({ page }) => {
  await page.goto('/');
  await page.locator('nav [aria-label="Show Applications"]').click();
  await page.locator('#app-terminal').click();

  const win = page.locator('[data-app-id="terminal"]');
  await win.focus();

  await page.keyboard.press('Tab');
  const closeBtn = page.getByLabel('Window close');
  await expect(closeBtn).toBeFocused();

  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  await expect(win).toBeFocused();
});
