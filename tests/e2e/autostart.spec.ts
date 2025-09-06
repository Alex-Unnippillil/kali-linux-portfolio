import { test, expect } from '@playwright/test';

// E2E tests for the Autostart settings page
// 1. Verify enabling/disabling user entries persists.
// 2. Confirm system entries cannot be edited.
// 3. Show banner when Restore session on login is enabled.

test.describe('Autostart settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/autostart');
  });

  test('enabling/disabling user entries persists after reload', async ({ page }) => {
    const userEntry = page.getByTestId('autostart-user-entry').first();
    const toggle = userEntry.getByRole('checkbox');

    const initial = await toggle.isChecked();
    await toggle.click();
    await expect(toggle).toBeChecked({ checked: !initial });

    await page.reload();

    const toggled = page
      .getByTestId('autostart-user-entry')
      .first()
      .getByRole('checkbox');
    await expect(toggled).toBeChecked({ checked: !initial });

    // restore original state to avoid side effects
    await toggled.click();
    await expect(toggled).toBeChecked({ checked: initial });
  });

  test('system entries cannot be edited', async ({ page }) => {
    const systemEntry = page.getByTestId('autostart-system-entry').first();
    const toggle = systemEntry.getByRole('checkbox');
    await expect(toggle).toBeDisabled();

    const checked = await toggle.isChecked();
    await toggle.click({ force: true });
    await expect(toggle).toBeChecked({ checked });
  });

  test('shows restore session banner when enabled', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('session:auto-save', 'true'));
    await page.reload();
    await expect(page.getByRole('alert')).toContainText(
      'Restore session on login',
    );
    await page.evaluate(() => localStorage.removeItem('session:auto-save'));
  });
});

