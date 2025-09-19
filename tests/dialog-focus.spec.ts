import { test, expect, Page } from '@playwright/test';

const waitForHydration = async (page: Page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
};

test.describe('Dialog focus management', () => {
  test('global shortcut overlay traps focus and restores trigger', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'keymap',
        JSON.stringify({
          'Show keyboard shortcuts': 'Shift+?',
          'Open settings': 'Ctrl+,',
        }),
      );
    });

    await page.goto('/apps');
    await waitForHydration(page);

    const trigger = page.getByRole('link', { name: 'About Alex' });
    await trigger.waitFor();
    await trigger.focus();

    await page.keyboard.press('Shift+Slash');

    const dialog = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    await expect(dialog).toBeVisible();

    const closeButton = dialog.getByRole('button', { name: 'Close' });
    await expect(closeButton).toBeFocused();

    const exportButton = dialog.getByRole('button', { name: 'Export JSON' });
    await page.keyboard.press('Tab');
    await expect(exportButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    await expect(trigger).toBeFocused();
  });

  test('settings keymap overlay traps focus and restores trigger', async ({ page }) => {
    await page.goto('/apps/settings');
    await waitForHydration(page);

    const accessibilityTab = page.getByRole('tab', { name: 'Accessibility' });
    await accessibilityTab.click();

    const trigger = page.getByRole('button', { name: 'Edit Shortcuts' });
    await trigger.waitFor();
    await trigger.focus();
    await trigger.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    await expect(dialog).toBeVisible();

    const closeButton = dialog.getByRole('button', { name: 'Close' });
    await expect(closeButton).toBeFocused();

    const rebindButton = dialog.getByRole('button', { name: 'Rebind' }).first();
    await page.keyboard.press('Tab');
    await expect(rebindButton).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    await expect(trigger).toBeFocused();
  });

  test('game help overlay traps focus and restores trigger', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('seen_tutorial_tower-defense', '1');
    });

    await page.goto('/apps/tower-defense');
    await waitForHydration(page);
    await page.reload({ waitUntil: 'networkidle' });
    await waitForHydration(page);
    await page.waitForTimeout(100);

    const existingDialog = page.getByRole('dialog', { name: 'tower-defense Help' });
    const trigger = page.getByRole('button', { name: 'Help' });
    try {
      await existingDialog.waitFor({ state: 'attached', timeout: 5000 });
      if (await existingDialog.isVisible()) {
        await existingDialog.getByRole('button', { name: 'Close' }).click();
        await expect(existingDialog).toHaveCount(0);
      }
    } catch (error) {
      if (!(error instanceof Error) || !/Timeout/.test(error.message || '')) {
        throw error;
      }
    }

    await trigger.waitFor({ state: 'visible' });
    await trigger.focus();
    await trigger.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'tower-defense Help' });
    await expect(dialog).toBeVisible();

    const closeButton = dialog.getByRole('button', { name: 'Close' });
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    await expect(trigger).toBeFocused();
  });
});
