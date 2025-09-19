import { test, expect } from '@playwright/test';

test.describe('App grid interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/apps');
    await page.waitForSelector('[data-testid="app-grid-viewport"]');
  });

  test('filters quickly when typing in the search box', async ({ page }) => {
    await page.locator('[data-testid="category-games"]').click();
    const searchInput = page.getByTestId('app-grid-search');
    await searchInput.fill('Chess');
    await page.waitForTimeout(150);
    await expect(page.locator('[data-testid="app-tile-chess"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-tile-2048"]')).toHaveCount(0);
  });

  test('paginates between result sets', async ({ page }) => {
    await page.locator('[data-testid="category-games"]').click();
    await page.waitForSelector('[data-testid^="app-tile-"]');
    const firstTileBefore = await page.locator('[data-testid^="app-tile-"]').first().getAttribute('data-testid');
    await page.locator('[data-testid="next-page"]').click();
    await expect(page.locator('[data-testid="page-indicator"]')).toContainText('Page 2');
    const firstTileAfter = await page.locator('[data-testid^="app-tile-"]').first().getAttribute('data-testid');
    expect(firstTileAfter).not.toBe(firstTileBefore);
  });

  test('supports keyboard navigation for pages and categories', async ({ page }) => {
    await page.locator('[data-testid="category-apps"]').click();
    await page.waitForSelector('[data-testid^="app-tile-"]');
    await page.locator('[data-testid^="app-tile-"]').first().click();
    await page.keyboard.press('PageDown');
    await expect(page.locator('[data-testid="page-indicator"]')).toContainText('Page 2');
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Control');
    await expect(page.locator('[data-testid="category-utilities"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="page-indicator"]')).toContainText('Page 1');
  });

  test('persists last used category and page', async ({ page }) => {
    await page.locator('[data-testid="category-games"]').click();
    await page.locator('[data-testid="next-page"]').click();
    await expect(page.locator('[data-testid="page-indicator"]')).toContainText('Page 2');
    await page.reload();
    await page.waitForSelector('[data-testid="app-grid-viewport"]');
    await expect(page.locator('[data-testid="category-games"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="page-indicator"]')).toContainText('Page 2');
  });
});
