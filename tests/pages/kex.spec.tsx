import { test, expect } from '@playwright/test';

test.describe('/kex', () => {
  test('cards describe Window & Seamless modes and link to docs', async ({ page }) => {
    await page.goto('/kex');

    const modes = ['Window Mode', 'Seamless Mode'];
    for (const mode of modes) {
      const card = page.locator('a', { has: page.locator('h2', { hasText: mode }) });
      await expect(card.locator('p')).toHaveText(/.+/);
      await expect(card).toHaveAttribute('href', /https:\/\/www\.kali\.org\/docs\/wsl\/win-kex/);
    }
  });
});
