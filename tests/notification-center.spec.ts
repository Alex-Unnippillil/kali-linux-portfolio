import { test, expect } from '@playwright/test';

const PAGE_URL = '/tests/notification-center';
const STORAGE_KEY = 'notification-center::history';

const seedDemo = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(({ key }) => {
    try {
      window.localStorage?.removeItem(key);
    } catch (err) {
      console.warn('Unable to reset notification storage', err);
    }
  }, { key: STORAGE_KEY });
  await page.goto(PAGE_URL);
  await page.getByTestId('seed-demo').click();
  await expect(page.getByRole('button', { name: 'All apps (6)' })).toBeVisible();
};

test.describe('Notification center demo', () => {
  test('supports roving focus across filters and grouped notifications', async ({ page }) => {
    await seedDemo(page);

    const allFilter = page.getByRole('button', { name: 'All apps (6)' });
    await allFilter.focus();
    await expect(allFilter).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('button', { name: 'Browser (2)' })).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(allFilter).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('button', { name: 'Terminal (2)' })).toBeFocused();

    await page.keyboard.press('ArrowDown');
    const browserNotifications = await page
      .locator('[data-testid="notification-item"][data-app-id="Browser"]')
      .all();
    await expect(browserNotifications[0]).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(browserNotifications[1]).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(browserNotifications[0]).toBeFocused();

    await page.keyboard.press('ArrowDown');
    const systemFirst = page
      .locator('[data-testid="notification-item"][data-app-id="System"]')
      .first();
    await expect(systemFirst).toBeFocused();

    await page.keyboard.press('ArrowUp');
    await expect(browserNotifications[0]).toBeFocused();

    await page.keyboard.press('ArrowUp');
    const terminalFirst = page
      .locator('[data-testid="notification-item"][data-app-id="Terminal"]')
      .first();
    await expect(terminalFirst).toBeFocused();
  });

  test('clears notifications per app and globally', async ({ page }) => {
    await seedDemo(page);

    const terminalGroup = page.getByTestId('notification-group-Terminal');
    await expect(terminalGroup).toHaveCount(1);

    await page.getByTestId('clear-app-Terminal').click();
    await expect(terminalGroup).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'All apps (4)' })).toBeVisible();

    const clearAll = page.getByRole('button', { name: 'Clear all notifications' });
    await clearAll.click();
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(0);
    await expect(page.getByText('No notifications yet.')).toBeVisible();
    await expect(clearAll).toBeDisabled();

    const stored = await page.evaluate(key => window.localStorage.getItem(key), STORAGE_KEY);
    expect(stored).toBeNull();
  });
});
