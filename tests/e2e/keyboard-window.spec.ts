import { test, expect } from '@playwright/test';

// Verify keyboard-driven window management: open apps, cycle focus, interact, close.
test('keyboard window management', async ({ page }) => {
  await page.goto('/');

  // Helper to launch an app using the keyboard only.
  const launch = async (id: string) => {
    const showApps = page.locator('nav [aria-label="Show Applications"]');
    await showApps.press('Enter');
    const tile = page.locator(`#app-${id}`);
    await expect(tile).toBeVisible();
    await tile.press('Enter');
    await expect(page.locator(`[data-app-id="${id}"]`)).toBeVisible();
  };

  await launch('terminal');
  await launch('gedit');

  const terminalWin = page.locator('[data-app-id="terminal"]');
  const geditWin = page.locator('[data-app-id="gedit"]');

  // Cycle focus using Alt+Tab: should bring terminal to the front.
  await page.keyboard.down('Alt');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Alt');

  await expect(terminalWin).not.toHaveClass(/notFocused/);
  await expect(geditWin).toHaveClass(/notFocused/);

  // Activate controls inside the terminal by typing a command.
  await page.keyboard.type('echo test');
  await page.keyboard.press('Enter');
  await expect(terminalWin.locator('.xterm-rows')).toContainText('echo test');

  // Close terminal via Alt+F4.
  await page.keyboard.down('Alt');
  await page.keyboard.press('F4');
  await page.keyboard.up('Alt');
  await expect(terminalWin).toBeHidden();

  // Close gedit via Alt+F4 as well.
  await page.keyboard.down('Alt');
  await page.keyboard.press('F4');
  await page.keyboard.up('Alt');
  await expect(geditWin).toBeHidden();
});

