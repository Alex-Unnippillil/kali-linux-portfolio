import { test, expect } from '@playwright/test';

// Test advanced settings for the file manager.
// Toggles the "Vertical split" option and verifies panes rotate
// and a restart requirement is indicated.

test.describe('File manager advanced settings', () => {
  test('toggle vertical split and verify restart label', async ({ page }) => {
    // Navigate to the file manager application
    await page.goto('/apps/file-explorer');

    // Open the Advanced settings tab
    await page.click('text=Advanced');

    const panes = page.locator('[data-testid="file-manager-panes"]');
    const initialDirection = await panes.evaluate((el) => getComputedStyle(el).flexDirection);

    const verticalSplitToggle = page.getByLabel('Vertical split');
    await verticalSplitToggle.click();

    const restartLabel = page.locator('label:has-text("Vertical split") >> text=/restart/i');
    const needsRestart = await restartLabel.isVisible();

    // Restart if the UI indicates it is required
    if (needsRestart) {
      await page.reload();
    }

    const newDirection = await panes.evaluate((el) => getComputedStyle(el).flexDirection);

    // Panes should rotate orientation after the change
    expect(newDirection).not.toBe(initialDirection);

    // The label should indicate a restart requirement
    await expect(restartLabel).toBeVisible();
  });
});
