import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 12'] });

test.describe('mobile safe area adjustments', () => {
  test('desktop chrome respects viewport insets', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.main-navbar-vp', { state: 'visible' });
    await page.waitForSelector('#window-area', { state: 'visible' });

    await page.evaluate(() => {
      const root = document.documentElement;
      root.style.setProperty('--safe-area-top', '24px');
      root.style.setProperty('--safe-area-right', '20px');
      root.style.setProperty('--safe-area-bottom', '32px');
      root.style.setProperty('--safe-area-left', '18px');
    });

    const desktopPadding = await page.locator('.desktop-shell').evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        left: parseFloat(styles.paddingLeft || '0'),
        right: parseFloat(styles.paddingRight || '0'),
        bottom: parseFloat(styles.paddingBottom || '0'),
      };
    });

    expect(desktopPadding.left).toBeGreaterThanOrEqual(18);
    expect(desktopPadding.right).toBeGreaterThanOrEqual(20);
    expect(desktopPadding.bottom).toBeGreaterThanOrEqual(32);

    const navPadding = await page.locator('.main-navbar-vp').evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        left: parseFloat(styles.paddingLeft || '0'),
        right: parseFloat(styles.paddingRight || '0'),
        top: parseFloat(styles.paddingTop || '0'),
      };
    });

    expect(navPadding.left).toBeGreaterThanOrEqual(18);
    expect(navPadding.right).toBeGreaterThanOrEqual(20);
    expect(navPadding.top).toBeGreaterThanOrEqual(24);

    const clockButton = page.locator('button[aria-haspopup="dialog"][aria-controls]');
    await clockButton.first().click();

    const popoverMetrics = await page
      .locator('div[role="dialog"][aria-label="Calendar"]')
      .evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top,
          rightMargin: window.innerWidth - (rect.left + rect.width),
        };
      });

    expect(popoverMetrics.top).toBeGreaterThanOrEqual(36);
    expect(popoverMetrics.rightMargin).toBeGreaterThanOrEqual(20);
  });
});
