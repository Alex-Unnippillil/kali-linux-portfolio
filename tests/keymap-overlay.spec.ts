import { test, expect } from '@playwright/test';

// Playwright test to exercise keymap overlay: open overlay, rebind keys, resolve conflicts, and persist state.

test.describe('Keyboard shortcut overlay', () => {
  test('rebinds keys and resolves conflicts', async ({ page }) => {
    // Clear any persisted keymap before navigating
    await page.addInitScript(() => localStorage.clear());

    await page.goto('/apps/settings');

    // Navigate to the Accessibility tab and open the shortcut editor
    await page.getByRole('tab', { name: 'Accessibility' }).click();
    await page.getByRole('button', { name: 'Edit Shortcuts' }).click();

    // Rebind "Show keyboard shortcuts" to Alt+S
    const showShortcuts = page.locator('li', { hasText: 'Show keyboard shortcuts' });
    await showShortcuts.getByRole('button').click();
    await page.keyboard.press('Alt+S');
    await expect(showShortcuts.locator('span.font-mono')).toHaveText('Alt+S');

    // Rebind "Open settings" to the same keys to create a conflict
    const openSettings = page.locator('li', { hasText: 'Open settings' });
    await openSettings.getByRole('button').click();
    await page.keyboard.press('Alt+S');
    await expect(showShortcuts).toHaveAttribute('data-conflict', 'true');
    await expect(openSettings).toHaveAttribute('data-conflict', 'true');

    // Resolve conflict by giving "Open settings" a different combo
    await openSettings.getByRole('button').click();
    await page.keyboard.press('Alt+O');
    await expect(showShortcuts).toHaveAttribute('data-conflict', 'false');
    await expect(openSettings).toHaveAttribute('data-conflict', 'false');

    // Close the overlay and verify mapping persisted
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const stored = await page.evaluate(() => localStorage.getItem('keymap'));
    const map = stored ? JSON.parse(stored) : {};
    expect(map['Show keyboard shortcuts']).toBe('Alt+S');
    expect(map['Open settings']).toBe('Alt+O');
  });
});

