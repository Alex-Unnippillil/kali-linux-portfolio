import { test, expect } from '@playwright/test';

test.describe('layout indicator', () => {
  test('cycles layouts and toggles IME badge', async ({ page }) => {
    await page.goto('/');

    const indicator = page.locator('[data-testid="layout-indicator"]');
    const indicatorCount = await indicator.count();
    test.skip(indicatorCount === 0, 'layout indicator not available');

    const badge = indicator.locator('[data-testid="ime-badge"]');

    const initial = await indicator.textContent();
    await indicator.click();
    await expect(indicator).not.toHaveText(initial || '');

    await page.keyboard.press('Control+Space');
    await expect(badge).toBeVisible();

    await page.keyboard.press('Control+Space');
    await expect(badge).toBeHidden();
  });
});
