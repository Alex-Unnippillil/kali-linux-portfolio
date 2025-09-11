import { test, expect } from '@playwright/test';

// E2E tests for the Autostart settings page
// 1. Verify enabling/disabling user entries persists.
// 2. Confirm system entries cannot be edited.
// 3. Test Trigger dropdown and Reset autostart action.

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

    const toggled = userEntry.getByRole('checkbox');
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

  test('Trigger dropdown and Reset autostart', async ({ page }) => {
    const entry = page.getByTestId('autostart-user-entry').first();
    const trigger = entry.getByTestId('trigger-select');
    const toggle = entry.getByRole('checkbox');
    const reset = page.getByRole('button', { name: /reset autostart/i });

    const initialToggle = await toggle.isChecked();
    const initialValue = await trigger.inputValue();

    const options = await trigger.locator('option').all();
    if (options.length > 1) {
      const newValue = await options[1].getAttribute('value');
      await trigger.selectOption(newValue!);
      await expect(trigger).toHaveValue(newValue!);
    }

    await toggle.click();
    await expect(toggle).toBeChecked({ checked: !initialToggle });

    await reset.click();

    await expect(trigger).toHaveValue(initialValue);
    await expect(toggle).toBeChecked({ checked: initialToggle });
  });
});

