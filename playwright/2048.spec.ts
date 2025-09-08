import { test, expect, Page } from '@playwright/test';

// Helper to read the board as an array of cell texts
async function getBoard(page: Page) {
  return page.locator('.grid > div > div').allTextContents();
}

test.describe('2048 game', () => {
  test('responds to keyboard moves', async ({ page }) => {
    await page.goto('/apps/2048');
    const before = await getBoard(page);
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => getBoard(page)).not.toEqual(before);
  });

  test('supports swipe gestures', async ({ page }) => {
    await page.goto('/apps/2048');
    const before = await getBoard(page);
    // simulate swipe left
    await page.dispatchEvent('body', 'touchstart', { touches: [{ clientX: 200, clientY: 200 }] });
    await page.dispatchEvent('body', 'touchend', { changedTouches: [{ clientX: 100, clientY: 200 }] });
    await expect.poll(async () => getBoard(page)).not.toEqual(before);
  });

  test('undo and restart work', async ({ page }) => {
    await page.goto('/apps/2048');
    const initial = await getBoard(page);
    await page.keyboard.press('ArrowUp');
    const moved = await getBoard(page);
    await page.getByRole('button', { name: /undo/i }).click();
    await expect.poll(async () => getBoard(page)).toEqual(initial);
    await page.getByRole('button', { name: /restart|reset/i }).click();
    await expect
      .poll(async () => (await getBoard(page)).filter((v) => v.trim()).length)
      .toBe(2);
  });

  test('hard mode times out the game', async ({ page }) => {
    await page.goto('/apps/2048');
    await page.getByLabel('Hard').check();
    await page.waitForTimeout(4000);
    await expect(page.getByText('Game over')).toBeVisible();
  });
});

