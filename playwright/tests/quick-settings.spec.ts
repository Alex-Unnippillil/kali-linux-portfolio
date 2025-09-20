import { test, expect } from '@playwright/test';

test.describe('Quick settings panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'System status' }).click();
    await expect(page.locator('#quick-settings-panel')).toBeVisible();
  });

  test('toggles network access', async ({ page }) => {
    const toggle = page.getByRole('switch', { name: 'Network Access' });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test('long pressing dark theme opens the appearance settings tab', async ({ page }) => {
    const darkToggle = page.getByRole('switch', { name: 'Dark Theme' });
    await darkToggle.hover();
    await darkToggle.dispatchEvent('pointerdown', {
      button: 0,
      pointerType: 'mouse',
      isPrimary: true,
    });
    await page.waitForTimeout(600);
    await darkToggle.dispatchEvent('pointerup', {
      button: 0,
      pointerType: 'mouse',
      isPrimary: true,
    });
    await page.waitForURL('**/apps/settings?tab=appearance');
    const appearanceTab = page.getByRole('tab', { name: 'Appearance' });
    await expect(appearanceTab).toHaveAttribute('aria-selected', 'true');
  });
});
