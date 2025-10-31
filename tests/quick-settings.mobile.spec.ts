import { test, expect } from '@playwright/test';

test.describe('Quick settings mobile interactions', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('#status-bar')).toBeVisible({ timeout: 15000 });
  });

  test('opens quick settings from status bar tap', async ({ page }) => {
    await page.locator('#status-bar').click({ force: true });

    const quickSettings = page.locator('#quick-settings-panel');
    await expect(quickSettings).toBeVisible();
    await expect(quickSettings).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#status-bar')).toHaveAttribute('aria-expanded', 'true');
  });

  test('opens quick settings via top-edge pull gesture', async ({ page }) => {
    const panel = page.locator('#quick-settings-panel');
    await expect(panel).toHaveCount(0);

    await page.evaluate(() => {
      const pointerDown = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
        clientX: window.innerWidth / 2,
        clientY: 2,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(pointerDown);

      const pointerMove = new PointerEvent('pointermove', {
        pointerId: 1,
        pointerType: 'touch',
        clientX: window.innerWidth / 2,
        clientY: 92,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(pointerMove);

      const pointerUp = new PointerEvent('pointerup', {
        pointerId: 1,
        pointerType: 'touch',
        clientX: window.innerWidth / 2,
        clientY: 132,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(pointerUp);
    });

    const quickSettings = page.locator('#quick-settings-panel');
    await expect(quickSettings).toBeVisible();
    await expect(quickSettings).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#status-bar')).toHaveAttribute('aria-expanded', 'true');
  });
});
