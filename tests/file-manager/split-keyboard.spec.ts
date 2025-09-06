import { test } from '@playwright/test';

test.describe.skip('File manager split view keyboard navigation', () => {
  test('cycles focus and copies/moves between panes', async ({ page }) => {
    // Navigate to the file manager app
    await page.goto('/apps/file-manager');

    // TODO: Open split view

    // TODO: Use F6, Tab, and Shift+F6 to cycle focus and swap panes

    // TODO: Confirm copy/move shortcuts operate between panes
  });
});
