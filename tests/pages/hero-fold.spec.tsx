import { test, expect } from '@playwright/test';

// Ensures hero content is visible without scrolling on a typical laptop viewport
// by verifying the hero section fits within a 1366x768 viewport.
test('hero content remains above the fold on laptop viewports', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/platform/vmware');
  const hero = page.locator('main section').first();
  const box = await hero.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.y + box.height).toBeLessThanOrEqual(768);
  }
});
