import { test, expect } from '@playwright/test';

test.describe('RTL layout toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage?.setItem('direction', 'ltr');
    });
  });

  test('applies and removes RTL layout settings', async ({ page }) => {
    await page.goto('http://localhost:3000/apps/settings');

    await page.getByRole('tab', { name: 'Accessibility' }).click();
    const rtlSwitch = page.getByRole('switch', { name: 'Right-to-left layout' });

    if ((await rtlSwitch.getAttribute('aria-checked')) !== 'true') {
      await rtlSwitch.click();
    }

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('dir')))
      .toBe('rtl');
    await expect(page.locator('body')).toHaveAttribute('dir', 'rtl');

    const dock = page.locator('nav[aria-label="Dock"]');
    await expect(dock).toHaveCSS('right', '0px');

    await rtlSwitch.click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('dir')))
      .toBe('ltr');
  });
});
