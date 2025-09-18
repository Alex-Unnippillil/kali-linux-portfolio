import { test, expect } from '@playwright/test';

test.describe('window minimize and restore', () => {
  test('restores geometry and focus via taskbar', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForFunction(() => !!document.getElementById('desktop'), null, {
      timeout: 120000,
    });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'input-lab' }));
    });

    const windowLocator = page.locator('#input-lab');
    await expect(windowLocator).toBeVisible({ timeout: 60000 });

    const beforeBounds = await windowLocator.boundingBox();
    expect(beforeBounds).not.toBeNull();

    const input = windowLocator.locator('#input-lab-text');
    await input.fill('Minimize Test');

    await windowLocator.locator('button[aria-label="Window minimize"]').click();

    await expect(windowLocator).not.toBeVisible();

    const activeTaskbarButton = page.locator('button[data-state="active"]');
    await expect(activeTaskbarButton).toHaveCount(1);
    const activeAppId = await activeTaskbarButton.first().getAttribute('data-app-id');
    expect(activeAppId).toBeTruthy();
    expect(activeAppId).not.toBe('input-lab');
    if (activeAppId) {
      const activeWindow = page.locator(`#${activeAppId}`);
      await expect(activeWindow).toHaveClass(/z-30/);
    }

    const taskbarButton = page.locator('button[data-app-id="input-lab"]');
    await expect(taskbarButton).toHaveAttribute('data-state', 'minimized');

    await taskbarButton.click();

    await expect(windowLocator).toBeVisible();
    await expect(windowLocator).toHaveClass(/z-30/);
    await expect(taskbarButton).toHaveAttribute('data-state', 'active');
    await expect(input).toHaveValue('Minimize Test');

    const afterBounds = await windowLocator.boundingBox();
    expect(afterBounds).not.toBeNull();
    if (beforeBounds && afterBounds) {
      expect(afterBounds.width).toBeCloseTo(beforeBounds.width, 1);
      expect(afterBounds.height).toBeCloseTo(beforeBounds.height, 1);
      expect(afterBounds.x).toBeCloseTo(beforeBounds.x, 1);
      expect(afterBounds.y).toBeCloseTo(beforeBounds.y, 1);
    }
  });
});
