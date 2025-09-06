import { test, expect } from '@playwright/test';

test.describe('panel plugin tooltips', () => {
  test('displays storage tooltip with correct formatting', async ({ page }) => {
    await page.goto('/');

    // Locate the plugin element whose tooltip describes free disk space
    const diskPlugin = page.locator('[title^="Free:"]');
    await diskPlugin.hover();

    const tooltip = await diskPlugin.getAttribute('title');
    expect(tooltip).not.toBeNull();
    expect(tooltip!).toMatch(/^Free: \d+(?:\.\d+)?\u202fGB of \d+(?:\.\d+)?\u202fGB$/);
  });
});
