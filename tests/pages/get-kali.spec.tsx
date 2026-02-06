import { test, expect } from '@playwright/test';

const options = ['Live', 'Cloud', 'Containers', 'WSL', 'ARM', 'NetHunter'];

test('get-kali grid shows options with pros and cons', async ({ page }) => {
  await page.goto('/get-kali');
  for (const option of options) {
    const card = page.locator('a.card', { hasText: option }).first();
    await expect(card, `${option} card should be visible`).toBeVisible();
    await expect(card.locator('ul.positives'), `${option} should list pros`).toBeVisible();
    const negatives = card.locator('ul.negatives');
    if (option !== 'NetHunter') {
      await expect(negatives, `${option} should list cons`).toBeVisible();
    }
  }
});
