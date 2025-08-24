import { test, expect } from '@playwright/test';

test('filters projects by tag', async ({ page }) => {
  await page.goto('/apps/project-gallery');
  await page.click('button:has-text("game")');
  const titles = page.locator('h3');
  await expect(titles).toContainText(['Tower Defense Game', 'Checkers']);
});
