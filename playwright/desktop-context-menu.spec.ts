import { expect, test } from '@playwright/test';

test.describe('desktop context menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#desktop');
  });

  test('positions context menu within viewport near edges', async ({ page }) => {
    const menu = page.locator('#desktop-menu');
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Viewport not available');

    await page.mouse.click(viewport.width - 5, viewport.height - 5, { button: 'right' });
    await expect(menu).toBeVisible();
    const bottomRight = await menu.boundingBox();
    expect(bottomRight).not.toBeNull();
    if (!bottomRight) return;
    expect(bottomRight.x + bottomRight.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(bottomRight.y + bottomRight.height).toBeLessThanOrEqual(viewport.height + 1);

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();

    await page.mouse.click(5, 5, { button: 'right' });
    await expect(menu).toBeVisible();
    const topLeft = await menu.boundingBox();
    expect(topLeft).not.toBeNull();
    if (!topLeft) return;
    expect(topLeft.x).toBeGreaterThanOrEqual(0);
    expect(topLeft.y).toBeGreaterThanOrEqual(0);
  });

  test('traps focus and restores it to the triggering icon on Escape', async ({ page }) => {
    const firstIcon = page.locator('[data-context="app"]').first();
    await firstIcon.focus();
    await firstIcon.click({ button: 'right' });

    const menu = page.locator('#desktop-menu');
    await expect(menu).toBeVisible();

    // Ensure focus starts inside the menu
    await expect(menu.locator('button').first()).toBeFocused();

    // Tab stays within the menu
    for (let i = 0; i < 3; i += 1) {
      await page.keyboard.press('Tab');
      const focusedInside = await page.evaluate(() => {
        const menuEl = document.getElementById('desktop-menu');
        return menuEl?.contains(document.activeElement);
      });
      expect(focusedInside).toBeTruthy();
    }

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(firstIcon).toBeFocused();
  });

  test('restores focus to desktop surface when opened from background', async ({ page }) => {
    const surface = page.locator('#window-area');
    await surface.focus();
    const box = await surface.boundingBox();
    if (!box) throw new Error('Desktop surface not found');

    await page.mouse.click(box.x + 20, box.y + 20, { button: 'right' });
    const menu = page.locator('#desktop-menu');
    await expect(menu).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(surface).toBeFocused();
  });

  test('select all marks desktop icons as selected', async ({ page }) => {
    await page.mouse.click(20, 80, { button: 'right' });
    const menu = page.locator('#desktop-menu');
    await expect(menu).toBeVisible();

    await page.getByRole('menuitem', { name: 'Select All' }).click();
    await expect(menu).toBeHidden();

    const icons = page.locator('[data-context="app"]');
    const count = await icons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      await expect(icons.nth(i)).toHaveAttribute('aria-selected', 'true');
    }
  });
});

