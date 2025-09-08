import { test, expect } from '@playwright/test';

test('multi-window management and dialogs', async ({ page }) => {
  await page.goto('/');
  const showApps = page.locator('nav [aria-label="Show Applications"]');
  await showApps.click();
  await page.locator('#app-terminal').click();
  await showApps.click();
  await page.locator('#app-gedit').click();

  const terminal = page.locator('[data-app-id="terminal"]');
  const gedit = page.locator('[data-app-id="gedit"]');

  await gedit.click();
  const zGedit = await gedit.evaluate((el) => Number(getComputedStyle(el).zIndex));
  const zTerm = await terminal.evaluate((el) => Number(getComputedStyle(el).zIndex));
  expect(zGedit).toBeGreaterThan(zTerm);

  const gHeader = gedit.locator('.cursor-move');
  const gBox = await gedit.boundingBox();
  if (gBox) {
    await gHeader.hover();
    await page.mouse.down();
    await page.mouse.move(gBox.x + 100, gBox.y + 100);
    await page.mouse.up();
    const moved = await gedit.boundingBox();
    expect(moved && moved.x).toBeGreaterThan(gBox.x);
  }

  const tHeader = terminal.locator('.cursor-move');
  const tBox = await terminal.boundingBox();
  if (tBox) {
    await tHeader.hover();
    await page.mouse.down();
    await page.mouse.move(5, tBox.y + 10);
    await page.mouse.up();
    const style = await terminal.getAttribute('style');
    expect(style).toContain('left: 0');
  }

  await page.keyboard.down('Alt');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Alt');
  const zTermFront = await terminal.evaluate((el) => Number(getComputedStyle(el).zIndex));
  const zGeditBack = await gedit.evaluate((el) => Number(getComputedStyle(el).zIndex));
  expect(zTermFront).toBeGreaterThan(zGeditBack);

  const zBefore = zTermFront;
  page.once('dialog', (d) => d.dismiss());
  await page.evaluate(() => alert('test'));
  const zAfter = await terminal.evaluate((el) => Number(getComputedStyle(el).zIndex));
  expect(zAfter).toBe(zBefore);
});
