import { test, expect } from '@playwright/test';

test.describe('Clipboard Manager shortcut', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const store = { text: '' };

      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            store.text = text;
          },
          readText: async () => store.text,
        },
      });

      const originalPermissions = (navigator as any).permissions || {};
      Object.defineProperty(navigator, 'permissions', {
        configurable: true,
        value: {
          ...originalPermissions,
          query: async () => ({ state: 'granted' }),
        },
      });
    });
  });

  test('Alt+V pastes last clipboard entry into target field', async ({ page }) => {
    await page.goto('/apps/clipboard-manager');

    await page.evaluate(async () => {
      await navigator.clipboard.writeText('First entry');
      document.dispatchEvent(new Event('copy'));
      await navigator.clipboard.writeText('Latest entry');
      document.dispatchEvent(new Event('copy'));
    });

    await expect(page.getByRole('listitem').first()).toHaveText('Latest entry');

    const target = page.getByTestId('clipboard-target');
    await target.click();
    await page.keyboard.press('Alt+V');

    await expect(target).toHaveValue('Latest entry');
    await expect(page.getByTestId('clipboard-toast')).toHaveText('Pasted last entry');
  });
});

