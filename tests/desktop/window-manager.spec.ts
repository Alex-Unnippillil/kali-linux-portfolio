import { test, expect } from '@playwright/test';

test('window manager interactions', async ({ page }) => {
  await page.goto('/');

  // open first app
  await page.locator('nav [aria-label="Show Applications"]').click();
  await page.locator('#app-terminal').click();
  const termWin = page.locator('[data-app-id="terminal"]');
  await expect(termWin).toBeVisible();

  // open second app
  await page.locator('nav [aria-label="Show Applications"]').click();
  await page.locator('#app-chrome').click();
  const chromeWin = page.locator('[data-app-id="chrome"]');
  await expect(chromeWin).toBeVisible();

  // z-index ordering
  const zTerm = await termWin.evaluate(el => parseInt(getComputedStyle(el).zIndex || '0'));
  const zChrome = await chromeWin.evaluate(el => parseInt(getComputedStyle(el).zIndex || '0'));
  expect(zChrome).toBeGreaterThan(zTerm);

  await termWin.click();
  const zTermFront = await termWin.evaluate(el => parseInt(getComputedStyle(el).zIndex || '0'));
  const zChromeBack = await chromeWin.evaluate(el => parseInt(getComputedStyle(el).zIndex || '0'));
  expect(zTermFront).toBeGreaterThan(zChromeBack);

  // drag behaviour
  const bar = chromeWin.locator('button').first();
  const box1 = await chromeWin.boundingBox();
  if (box1) {
    await bar.dragTo(bar, { targetPosition: { x: box1.x + 50, y: box1.y + 50 } });
    const box2 = await chromeWin.boundingBox();
    expect(box2 && box1 && box2.x !== box1.x).toBeTruthy();
  }

  // snap using keyboard
  await termWin.click();
  await page.keyboard.press('Meta+ArrowLeft');
  const snapBox = await termWin.boundingBox();
  const viewport = page.viewportSize();
  if (snapBox && viewport) {
    expect(Math.round(snapBox.x)).toBe(0);
    expect(Math.round(snapBox.width)).toBeCloseTo(viewport.width / 2, 1);
  }

  // keyboard navigation via Alt+Tab
  await page.keyboard.down('Alt');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Alt');
  await expect(chromeWin).toHaveAttribute('aria-selected', 'true');

  // dialog focus retention
  await chromeWin.click();
  const dialogPromise = page.waitForEvent('dialog');
  await page.evaluate(() => alert('hi'));
  const dialog = await dialogPromise;
  await dialog.accept();
  await expect(chromeWin).toHaveAttribute('aria-selected', 'true');
});
