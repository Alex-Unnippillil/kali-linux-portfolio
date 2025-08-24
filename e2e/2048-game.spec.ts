import { test, expect } from '../playwright.config';

test('2048 game state updates after moves', async ({ page }) => {
  test.setTimeout(20_000);
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/apps/2048');

  const webgl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return false;
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
  });
  expect(webgl).toBeTruthy();

  await page.waitForFunction(() => localStorage.getItem('2048_board') !== null);
  const before = await page.evaluate(() => localStorage.getItem('2048_board'));

  await page.locator('canvas').click();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowLeft');

  await page.waitForFunction(
    (b) => localStorage.getItem('2048_board') !== b,
    before
  );
  const after = await page.evaluate(() => localStorage.getItem('2048_board'));
  expect(after).not.toBe(before);
  expect(errors).toEqual([]);
});
