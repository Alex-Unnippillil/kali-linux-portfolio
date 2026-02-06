import { test, expect } from '@playwright/test';

test.describe('Input method settings', () => {
  test('toggles input method and shows tray icon and shortcut hint', async ({ page }) => {
    await page.goto('/apps/settings');

    const toggle = page.getByRole('switch', { name: /input method/i });
    await toggle.click();

    const trayIcon = page.locator('[aria-label="Input Method Tray Icon"]');
    await expect(trayIcon).toBeVisible();

    const hint = page.getByText(/ctrl\+space/i);
    await expect(hint).toBeVisible();

    await toggle.click();
    await expect(trayIcon).toBeHidden();
  });
});
