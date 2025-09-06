import { test, expect } from '@playwright/test';

// E2E tests for the Autostart settings page
// 1. Verify edits to user entries persist.
// 2. Confirm system entries cannot be edited.
// 3. Test Trigger chips and Reset autostart action.

test.describe('Autostart settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/autostart');
  });

  test('edits to user entries persist after reload', async ({ page }) => {
    const userEntry = page.getByTestId('autostart-user-entry').first();
    const toggle = userEntry.getByRole('checkbox');
    const suspend = userEntry.getByTestId('trigger-chip-suspend');

    const initial = await toggle.isChecked();
    await suspend.click();
    await toggle.click();

    await page.reload();

    const toggled = page.getByTestId('autostart-user-entry').first();
    const toggleReload = toggled.getByRole('checkbox');
    const suspendReload = toggled.getByTestId('trigger-chip-suspend');
    const loginReload = toggled.getByTestId('trigger-chip-login');
    await expect(toggleReload).toBeChecked({ checked: !initial });
    await expect(suspendReload).toHaveAttribute('data-active', 'true');

    // restore original state to avoid side effects
    await loginReload.click();
    await toggleReload.click();
  });

  test('system entries cannot be edited', async ({ page }) => {
    const systemEntry = page.getByTestId('autostart-system-entry').first();
    const toggle = systemEntry.getByRole('checkbox');
    await expect(toggle).toBeDisabled();

    const checked = await toggle.isChecked();
    await toggle.click({ force: true });
    await expect(toggle).toBeChecked({ checked });
  });

  test('Trigger chips and Reset autostart', async ({ page }) => {
    const entry = page.getByTestId('autostart-user-entry').first();
    const toggle = entry.getByRole('checkbox');
    const suspend = entry.getByTestId('trigger-chip-suspend');
    const login = entry.getByTestId('trigger-chip-login');
    const reset = page.getByRole('button', { name: /reset autostart/i });

    const initialToggle = await toggle.isChecked();
    await suspend.click();
    await toggle.click();
    await expect(suspend).toHaveAttribute('data-active', 'true');
    await expect(toggle).toBeChecked({ checked: !initialToggle });

    await reset.click();

    await expect(login).toHaveAttribute('data-active', 'true');
    await expect(toggle).toBeChecked({ checked: initialToggle });
  });
});

