import { expect, test } from '@playwright/test';

test.describe('Tetris app', () => {
  test('can start and hard drop', async ({ page }) => {
    await page.goto('/apps/tetris');
    await page.getByRole('button', { name: /start tetris game/i }).click();
    await page.keyboard.press('Space');
    await expect(page.getByLabel('Tetris board')).toBeVisible();
  });

  test('pause stops game loop overlay appears', async ({ page }) => {
    await page.goto('/apps/tetris');
    await page.getByRole('button', { name: /start tetris game/i }).click();
    await page.keyboard.press('KeyP');
    await expect(page.getByText('Paused')).toBeVisible();
  });
});
