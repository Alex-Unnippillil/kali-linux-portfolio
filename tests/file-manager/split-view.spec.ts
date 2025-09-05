import { test, expect } from '@playwright/test';

// Ensures file manager split view state persists across reloads
// and restores divider position.
test('restores split view with divider position', async ({ page }) => {
  // Open the file manager app
  await page.goto('/apps/file-manager');

  // Enable split view
  await page.getByRole('button', { name: /split view/i }).click();

  const divider = page.locator('[data-testid="split-view-divider"]');
  const panes = page.locator('[data-testid="split-view-pane"]');

  // Should now show two panes
  await expect(panes).toHaveCount(2);

  // Drag the divider a bit to adjust the size
  const box = await divider.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + box.height / 2);
    await page.mouse.up();
  }

  // Remember the divider position
  const before = await divider.evaluate((el) => el.style.left || el.style.top || '');

  // Reload the app
  await page.reload();

  // Split view should remain enabled
  await expect(panes).toHaveCount(2);

  // Divider position should be restored
  const after = await divider.evaluate((el) => el.style.left || el.style.top || '');
  expect(after).toBe(before);
});
