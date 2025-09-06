import { test, expect } from '@playwright/test';

// This test ensures that editing fields in the desktop launcher
// editor is immediately reflected in the application menu.
test('launcher changes are reflected in menu', async ({ page }) => {
  // Navigate to the desktop launcher editor
  await page.goto('/apps/desktop-editor');

  // Edit launcher fields
  await page.getByLabel('Name').fill('My Test App');
  await page.getByLabel('Command').fill('/usr/bin/test');
  await page.getByRole('button', { name: /save/i }).click();

  // Verify the menu entry updates immediately
  await expect(page.getByRole('menuitem', { name: 'My Test App' })).toBeVisible();
});
