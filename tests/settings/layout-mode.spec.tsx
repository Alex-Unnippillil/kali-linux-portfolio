import { test, expect } from '@playwright/test';

// Verifies that enabling per-window mode stores layouts separately for each browser window.
test('per-window mode restores layout per window', async ({ context }) => {
  // Open first window and enable per-window layout mode
  const pageA = await context.newPage();
  await pageA.goto('about:blank');
  await pageA.evaluate(() => {
    localStorage.setItem('layout-mode', 'per-window');
    sessionStorage.setItem('layout', 'layout-A');
  });

  // Open second window with a different layout
  const pageB = await context.newPage();
  await pageB.goto('about:blank');
  await pageB.evaluate(() => {
    localStorage.setItem('layout-mode', 'per-window');
    sessionStorage.setItem('layout', 'layout-B');
  });

  // Switch back to window A and confirm its layout
  await pageA.bringToFront();
  expect(await pageA.evaluate(() => sessionStorage.getItem('layout'))).toBe('layout-A');

  // Switch to window B and confirm its layout
  await pageB.bringToFront();
  expect(await pageB.evaluate(() => sessionStorage.getItem('layout'))).toBe('layout-B');

  // Reload each window to ensure layouts persist per window
  await pageA.reload();
  expect(await pageA.evaluate(() => sessionStorage.getItem('layout'))).toBe('layout-A');

  await pageB.reload();
  expect(await pageB.evaluate(() => sessionStorage.getItem('layout'))).toBe('layout-B');
});
