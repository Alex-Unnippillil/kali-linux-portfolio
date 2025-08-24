import { test, expect } from '../playwright.config';

test('All Apps grid tiles display a heading when opened', async ({ page }) => {
  await page.goto('/apps');
  const tiles = page.locator('a[href^="/apps/"]');
  const count = await tiles.count();

  for (let i = 0; i < count; i++) {
    const tile = tiles.nth(i);
    await Promise.all([
      page.waitForNavigation(),
      tile.click(),
    ]);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await page.goto('/apps');
  }
});
