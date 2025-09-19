import { test, expect } from '@playwright/test';

test.describe('window snapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booting_screen', 'false');
      window.localStorage.setItem('snap-enabled', 'true');
    });
  });

  test('shows snap preview and snaps to computed rectangle', async ({ page }) => {
    await page.goto('/');

    const windowLocator = page.locator('#about-alex');
    await windowLocator.waitFor({ state: 'visible' });

    const titleBar = windowLocator.locator('.bg-ub-window-title');
    const box = await titleBar.boundingBox();
    if (!box) {
      throw new Error('Failed to obtain window title bar bounds');
    }

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(10, box.y + box.height / 2, { steps: 10 });

    const preview = page.locator('[data-testid="snap-preview"]');
    await expect(preview).toBeVisible();

    const previewRect = await preview.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    });

    await page.mouse.up();
    await expect(preview).toBeHidden();

    await expect(windowLocator).toHaveAttribute('data-snap-position', 'left');

    const windowRect = await windowLocator.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    });

    const epsilon = 2;
    expect(Math.abs(windowRect.left - previewRect.left)).toBeLessThanOrEqual(epsilon);
    expect(Math.abs(windowRect.top - previewRect.top)).toBeLessThanOrEqual(epsilon);
    expect(Math.abs(windowRect.width - previewRect.width)).toBeLessThanOrEqual(epsilon);
    expect(Math.abs(windowRect.height - previewRect.height)).toBeLessThanOrEqual(epsilon);
  });
});
