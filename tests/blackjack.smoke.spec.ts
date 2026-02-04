import { test, expect } from '@playwright/test';

test('blackjack allows betting and hitting', async ({ page }) => {
  await page.goto('/apps/blackjack');
  await page.getByLabel('Add 1 chip').click();
  await page.getByRole('button', { name: 'Deal' }).click();
  await expect(page.getByText('Dealer')).toBeVisible();
  const hitButton = page.getByRole('button', { name: 'Hit' });
  await expect(hitButton).toBeVisible();
  await hitButton.click();
  await expect(page.getByText(/choose your action|Round settled/i)).toBeVisible();
});
