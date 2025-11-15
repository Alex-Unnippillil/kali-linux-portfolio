import { expect, test, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

const focusFirstTaskbarButton = async (page: Page) => {
  const buttons = page.locator('button[data-app-id]');
  await buttons.first().waitFor({ state: 'visible' });
  await buttons.first().focus();
  await expect(buttons.first()).toBeFocused();
  return buttons;
};

test.describe('Desktop keyboard navigation', () => {
  test('taskbar buttons support arrow navigation and previews', async ({ page }) => {
    await page.goto(BASE_URL);

    const buttons = await focusFirstTaskbarButton(page);
    await expect(buttons.nth(1)).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(buttons.nth(1)).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(buttons.first()).toBeFocused();

    await page.keyboard.press('ArrowDown');
    const preview = page.locator('role=dialog[name*="preview"i]');
    await expect(preview).toBeVisible();

    await page.keyboard.press('ArrowUp');
    await expect(preview).toBeHidden();
  });

  test('window controls respond to keyboard commands', async ({ page }) => {
    await page.goto(BASE_URL);

    await focusFirstTaskbarButton(page);
    await page.keyboard.press('Enter');

    const controls = page.locator('[data-window-controls] button');
    await controls.first().waitFor({ state: 'visible' });
    await controls.first().focus();
    await expect(controls.first()).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(controls.nth(1)).toBeFocused();

    await page.keyboard.press('End');
    await expect(controls.last()).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-window-controls] button')).toHaveCount(0, { timeout: 5000 });
  });
});
