import { test, expect } from '@playwright/test';

test('quote favorites persist across reloads', async ({ page }) => {
  await page.goto('/apps/quote');
  await page.waitForSelector('#quote-card');

  const favButton = page.getByRole('button', { name: 'Favorite' });
  await favButton.click();
  await expect(page.getByRole('button', { name: 'Unfavorite' })).toBeVisible();

  await page.waitForTimeout(1000);
  await page.reload();

  await page.locator('select').selectOption('favorites');
  await expect(page.getByRole('button', { name: 'Unfavorite' })).toBeVisible();
});
