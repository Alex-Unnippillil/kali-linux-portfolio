import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';

// The app-polish suffix includes this scoped spec in all three existing browser projects.
async function snapshot(page: Page, name: string) {
  await mkdir('portfolio-screenshots', { recursive: true });
  await page.screenshot({ path: `portfolio-screenshots/${name}.png`, animations: 'disabled' });
}
async function canvasPixels(page: Page) {
  return page.getByRole('img', { name: 'Pinball playfield' }).evaluate((element) => (element as HTMLCanvasElement).toDataURL());
}
for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`pinball playfield, input and pause at ${viewport.width}px`, async ({ page, browserName }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/apps/pinball');
    const game = page.getByTestId('pinball-app');
    const canvas = page.getByRole('img', { name: 'Pinball playfield' });
    await expect(game).toHaveAttribute('data-game-active', 'true');
    await expect(game).toHaveAttribute('data-reduced-motion', 'true');
    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThan(100);
    expect(bounds!.height).toBeGreaterThan(180);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await snapshot(page, `${browserName}-pinball-ready-${viewport.width}`);
    await page.keyboard.down('a'); await page.keyboard.down('d');
    await expect(game).toHaveAttribute('data-left-active', 'true');
    await expect(game).toHaveAttribute('data-right-active', 'true');
    await page.keyboard.up('a'); await page.keyboard.up('d');
    await page.keyboard.down('Space'); await page.waitForTimeout(200); await page.keyboard.up('Space');
    await expect(game).toHaveAttribute('data-phase', 'playing');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Pause game' }).click();
    await expect(game).toHaveAttribute('data-game-active', 'false');
    const paused = await canvasPixels(page);
    await page.waitForTimeout(250);
    expect(await canvasPixels(page)).toBe(paused);
    await snapshot(page, `${browserName}-pinball-paused-${viewport.width}`);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(game).toHaveAttribute('data-game-active', 'true');
    await page.getByRole('button', { name: 'Table settings' }).click();
    await page.getByRole('combobox', { name: 'Cabinet theme' }).selectOption('forest');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(game).toHaveAttribute('data-game-active', 'false');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'New game', exact: true }).click();
    await page.getByRole('button', { name: 'Start new game', exact: true }).click();
    await expect(game).toHaveAttribute('data-phase', 'ready');
    await page.getByRole('button', { name: 'Pause game' }).click();
    const violations = (await new AxeBuilder({ page }).include('[data-testid="pinball-app"]').analyze()).violations
      .filter((violation) => ['critical', 'serious'].includes(violation.impact || ''));
    expect(violations).toEqual([]);
    await snapshot(page, `${browserName}-pinball-cabinet-${viewport.width}`);
    expect(errors).toEqual([]);
  });
}

test('desktop registry launches the same game and pauses on window switches', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('#about')).toBeVisible();
  await page.getByRole('button', { name: 'Applications menu', exact: true }).click();
  const menu = page.getByTestId('whisker-menu-dropdown');
  await menu.getByRole('searchbox', { name: 'Search applications' }).fill('Pinball');
  await menu.getByTestId('whisker-menu-app-list').getByRole('button', { name: 'Pinball', exact: true }).click();
  const game = page.locator('#pinball').getByTestId('pinball-app');
  await expect(game).toBeVisible();
  await expect(game.getByRole('img', { name: 'Pinball playfield' })).toBeVisible();
  await page.locator('#pinball').getByRole('button', { name: 'Window minimize', exact: true }).click();
  await expect(game).toHaveAttribute('data-game-active', 'false');
  await snapshot(page, `${browserName}-pinball-desktop-minimized`);
});
