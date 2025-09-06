import { test, expect } from '@playwright/test';

// Verifies that switching back to system defaults resets any custom layouts
// and automatically disables per-window mode until the user re-enables it.
test('layout reset disables per-window mode', async ({ page }) => {
  // Open the settings page that controls layout behaviour
  await page.goto('/apps/settings');

  // Enable per-window mode
  const perWindowToggle = page.getByLabel('Per-window mode');
  await perWindowToggle.check();
  await expect(perWindowToggle).toBeChecked();

  // Toggle "Use system defaults" which should reset layouts
  await page.getByRole('button', { name: 'Use system defaults' }).click();

  // Layouts should be reset and per-window mode disabled
  await expect(perWindowToggle).not.toBeChecked();

  // Re-enable per-window mode to confirm the toggle works again
  await perWindowToggle.check();
  await expect(perWindowToggle).toBeChecked();
});
