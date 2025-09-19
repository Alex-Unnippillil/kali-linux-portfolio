import { test, expect } from '@playwright/test';

const GENERATED_COUNT = 200;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

test('desktop marquee selection scales to hundreds of icons', async ({ page }) => {
  await page.addInitScript((count) => {
    const folders = Array.from({ length: count }, (_, index) => ({
      id: `generated-${index}`,
      name: `Generated ${index}`,
    }));
    window.localStorage.setItem('new_folders', JSON.stringify(folders));
  }, GENERATED_COUNT);

  await page.goto('/');
  await page.waitForSelector('#desktop');
  await page.waitForFunction((count) => {
    return document.querySelectorAll('[data-context="app"]').length >= count;
  }, GENERATED_COUNT);

  const firstLocator = page.locator('#app-new-folder-generated-0');
  const lastLocator = page.locator(`#app-new-folder-generated-${GENERATED_COUNT - 1}`);
  await firstLocator.waitFor();
  await lastLocator.waitFor();

  const firstBox = await firstLocator.boundingBox();
  const lastBox = await lastLocator.boundingBox();
  if (!firstBox || !lastBox) {
    throw new Error('Generated desktop icons are not visible');
  }

  const startX = clamp(firstBox.x - 20, 0, firstBox.x + firstBox.width);
  const startY = clamp(firstBox.y - 20, 0, firstBox.y + firstBox.height);
  const endX = lastBox.x + lastBox.width + 20;
  const endY = lastBox.y + lastBox.height + 20;

  const beforeMetrics = await page.metrics();

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 30 });
  await page.mouse.up();

  await expect(page.locator('[data-selected="true"][id^="app-new-folder-generated-"]')).toHaveCount(GENERATED_COUNT);

  const afterMetrics = await page.metrics();
  expect(afterMetrics.TaskDuration - beforeMetrics.TaskDuration).toBeLessThan(0.4);
});
