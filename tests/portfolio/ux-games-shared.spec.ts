import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('shared game controls pause across minimize and explicit resume', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?app=2048');

  const game = page.locator('#2048');
  await expect(game).toBeVisible();
  const viewport = game.locator('[data-game-viewport]');
  await expect(viewport).toHaveAttribute('data-game-active', 'true');
  await expect(viewport.getByRole('toolbar', { name: 'Game controls' })).toBeVisible();

  await game.getByRole('button', { name: 'Window minimize' }).click();
  await expect(game).toHaveAttribute('aria-hidden', 'true');

  const taskbar = page.getByRole('navigation', { name: /taskbar/i });
  await taskbar.locator('button[data-app-id="2048"]').click();
  await expect(game).toBeVisible();
  await expect(viewport).toHaveAttribute('data-game-active', 'false');
  await expect(viewport.getByRole('dialog', { name: 'Game paused' })).toBeVisible();

  await viewport
    .getByRole('dialog', { name: 'Game paused' })
    .getByRole('button', { name: 'Resume' })
    .click();
  await expect(viewport).toHaveAttribute('data-game-active', 'true');

  await mkdir('portfolio-screenshots', { recursive: true });
  await page.screenshot({
    path: `portfolio-screenshots/${browserName}-games-shared-controls.png`,
    animations: 'disabled',
  });
});
