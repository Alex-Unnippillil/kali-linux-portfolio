import { expect, test, type Page } from '@playwright/test';

async function openCalculator(page: Page) {
  await page.getByRole('button', { name: 'Applications menu', exact: true }).click();
  const menu = page.getByTestId('whisker-menu-dropdown');
  await menu.getByRole('searchbox', { name: 'Search applications' }).fill('Calculator');
  await menu.getByTestId('whisker-menu-app-list').getByRole('button', { name: 'Calculator', exact: true }).click();
  await expect(page.locator('#calculator')).toBeVisible();
}

test('window and taskbar share compact mode and keyboard obstruction preserves desktop geometry', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  const saved = JSON.stringify({
    width: 60,
    height: 70,
    position: { x: 120, y: 90 },
    maximized: false,
    snapped: null,
    lastSize: null,
    preMaximizeBounds: null,
  });
  await page.addInitScript((layout) => localStorage.setItem('window-layout:calculator', layout), saved);
  await page.goto('/');
  await openCalculator(page);

  const calculator = page.locator('#calculator');
  const taskbar = page.getByRole('navigation', { name: 'Phone taskbar', exact: true });
  await expect(calculator).toHaveAttribute('data-window-compact', 'true');
  await expect(taskbar).toBeVisible();

  const input = calculator.locator('input').first();
  await input.focus();
  await page.setViewportSize({ width: 390, height: 520 });
  await expect(input).toBeFocused();
  await expect(calculator).toHaveAttribute('data-window-compact', 'true');
  await expect(taskbar).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('window-layout:calculator'))).toBe(saved);
  await context.close();
});
