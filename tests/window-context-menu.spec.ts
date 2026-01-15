import { test, expect } from '@playwright/test';

const PRESETS = [
  { width: 960, height: 600 },
  { width: 1200, height: 800 },
  { width: 1440, height: 900 },
];

test.describe('Window context menu presets', () => {
  test('resize the active window to preset dimensions', async ({ page }) => {
    await page.goto('/');

    const terminalIcon = page.getByRole('button', { name: 'Terminal' });
    await terminalIcon.dblclick();

    const windowDialog = page.getByRole('dialog', { name: 'Terminal' });
    await expect(windowDialog).toBeVisible();

    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    for (const preset of PRESETS) {
      await windowDialog.click({ button: 'right' });
      const menu = page.locator('#window-menu');
      await menu.waitFor({ state: 'visible' });

      await page
        .getByRole('menuitem', {
          name: `Resize window to ${preset.width} by ${preset.height} pixels`,
        })
        .click();

      await expect(menu).toBeHidden();
      await page.waitForTimeout(150);

      const box = await windowDialog.boundingBox();
      expect(box).not.toBeNull();

      if (!box) continue;

      const expectedWidthPercent = Math.min(100, Math.round((preset.width / viewport.width) * 100));
      const expectedHeightPercent = Math.min(100, Math.round((preset.height / viewport.height) * 100));
      const expectedWidth = (viewport.width * expectedWidthPercent) / 100;
      const expectedHeight = (viewport.height * expectedHeightPercent) / 100;
      const tolerance = 16;

      expect(box.width).toBeGreaterThanOrEqual(expectedWidth - tolerance);
      expect(box.width).toBeLessThanOrEqual(expectedWidth + tolerance);
      expect(box.height).toBeGreaterThanOrEqual(expectedHeight - tolerance);
      expect(box.height).toBeLessThanOrEqual(expectedHeight + tolerance);
    }
  });
});
