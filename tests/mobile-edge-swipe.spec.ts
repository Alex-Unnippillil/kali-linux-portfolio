import { test, expect, devices } from '@playwright/test';

const mobileDevices = [
  { name: 'iPhone 13', descriptor: devices['iPhone 13'] },
  { name: 'Pixel 5', descriptor: devices['Pixel 5'] },
];

for (const { name, descriptor } of mobileDevices) {
  test.describe(`${name} edge swipe`, () => {
    test.use({ ...descriptor });

    test(`opens the launcher with a left-edge swipe`, async ({ page }) => {
      await page.goto('/');

      const nav = page.locator('[data-testid="desktop-navbar"]');
      await nav.waitFor();

      await expect(page.locator('[data-testid="whisker-menu-dropdown"]')).toHaveCount(0);

      const navBox = await nav.boundingBox();
      if (!navBox) {
        throw new Error('Navbar bounding box unavailable');
      }

      const gestureStartX = 4;
      const gestureEndX = 80;
      const gestureY = Math.round(navBox.y + navBox.height / 2);

      await page.evaluate(({ startX, endX, y }) => {
        const pointerId = 7;
        const baseEvent: PointerEventInit = {
          pointerId,
          pointerType: 'touch',
          bubbles: true,
          cancelable: true,
          composed: true,
        };

        const dispatch = (type: string, clientX: number) => {
          const target = document.elementFromPoint(clientX, y) ?? document.body;
          target.dispatchEvent(new PointerEvent(type, { ...baseEvent, clientX, clientY: y }));
        };

        dispatch('pointerdown', startX);
        const steps = 4;
        for (let step = 1; step <= steps; step += 1) {
          const progress = startX + ((endX - startX) * step) / steps;
          dispatch('pointermove', progress);
        }
        dispatch('pointerup', endX);
      }, { startX: gestureStartX, endX: gestureEndX, y: gestureY });

      await expect(page.locator('[data-testid="whisker-menu-dropdown"]')).toBeVisible();
    });
  });
}
