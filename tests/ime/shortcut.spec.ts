import { test, expect } from '@playwright/test';

test.describe('IME shortcut', () => {
  test('default Super+Space toggles IME with toast', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Meta+Space');
    await expect(page.getByRole('status')).toContainText('IME enabled');
    await page.keyboard.press('Meta+Space');
    await expect(page.getByRole('status')).toContainText('IME disabled');
  });

  test('configured shortcut toggles IME', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'keymap',
        JSON.stringify({ 'Toggle IME': 'Control+Alt+K' })
      );
    });
    await page.goto('/');
    await page.keyboard.press('Control+Alt+K');
    await expect(page.getByRole('status')).toContainText('IME enabled');
  });
});
