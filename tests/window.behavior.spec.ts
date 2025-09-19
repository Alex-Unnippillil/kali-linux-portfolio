import { test, expect } from '@playwright/test';

const tolerance = 4;

test.describe('desktop window behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#about-alex')).toBeVisible();
  });

  test('double clicking the title bar toggles maximize and restore', async ({ page }) => {
    const windowLocator = page.locator('#about-alex');
    const titleBar = windowLocator.locator('.bg-ub-window-title');

    const initial = await windowLocator.boundingBox();
    if (!initial) throw new Error('Initial window bounds unavailable');

    await titleBar.dblclick();
    await page.waitForTimeout(400);
    const maximized = await windowLocator.boundingBox();
    if (!maximized) throw new Error('Maximized window bounds unavailable');

    expect(maximized.width).toBeGreaterThan(initial.width + 100);
    expect(maximized.height).toBeGreaterThan(initial.height + 50);

    await titleBar.dblclick();
    await page.waitForTimeout(400);
    const restored = await windowLocator.boundingBox();
    if (!restored) throw new Error('Restored window bounds unavailable');

    expect(Math.abs(restored.x - initial.x)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(restored.y - initial.y)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(restored.width - initial.width)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(restored.height - initial.height)).toBeLessThanOrEqual(tolerance);
  });

  test('fullscreen mode hides chrome and restores on exit', async ({ page }) => {
    const desktop = page.locator('#desktop');
    const taskbar = page.locator('[role="toolbar"]');

    await expect(taskbar).toBeVisible();

    await page.click('#window-area', { button: 'right' });
    const menu = page.locator('#desktop-menu');
    await expect(menu).toBeVisible();
    await menu.getByRole('menuitem', { name: /Enter Full Screen/i }).click();

    await expect.poll(async () => page.evaluate(() => document.fullscreenElement !== null)).toBeTruthy();
    await expect(desktop).toHaveClass(/.*pt-0.*/);
    await expect(taskbar).not.toBeVisible();

    await page.keyboard.press('Escape');
    await expect.poll(async () => page.evaluate(() => document.fullscreenElement === null)).toBeTruthy();
    await expect(desktop).toHaveClass(/.*pt-8.*/);
    await expect(taskbar).toBeVisible();
  });
});
