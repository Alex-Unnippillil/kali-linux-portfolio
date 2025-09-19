import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000/';

test.describe('command palette', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booting_screen', 'false');
      window.localStorage.setItem('qs-theme', JSON.stringify('light'));
      window.localStorage.setItem('qs-reduce-motion', JSON.stringify(false));
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#desktop');
    await page.waitForTimeout(2000);
    await page.mouse.click(10, 10);
  });

  test('launches terminal from the command palette', async ({ page }) => {
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByTestId('command-palette');
    await expect(palette).toBeVisible();

    const input = page.getByTestId('command-palette-input');
    await input.fill('terminal');
    await page.keyboard.press('Enter');

    await expect(palette).toBeHidden();
    await expect(page.locator('#terminal')).toBeVisible({ timeout: 5000 });
  });

  test('toggles theme via the command palette', async ({ page }) => {
    const initialTheme = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );

    await page.keyboard.press('Control+KeyK');
    await expect(page.getByTestId('command-palette')).toBeVisible();

    await page.getByTestId('command-palette-input').fill('toggle theme');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('command-palette')).toBeHidden();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .not.toBe(initialTheme);
  });
});
