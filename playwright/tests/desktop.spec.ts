import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const APP_MENU_BUTTON = 'Applications';

async function prepareDesktop(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('booting_screen', 'false');
    window.localStorage.setItem('screen-locked', 'false');
    window.localStorage.setItem('qs-theme', 'light');
  });
  await page.goto('/');
  await page.waitForSelector('#desktop', { state: 'visible' });
}

test.describe('Desktop experience', () => {
  test.beforeEach(async ({ page }) => {
    await prepareDesktop(page);
  });

  test('user can navigate core desktop interactions', async ({ page }) => {
    // Open the whisker menu.
    await page.getByRole('button', { name: APP_MENU_BUTTON }).click();
    const menuPanel = page
      .locator('div')
      .filter({ has: page.getByRole('button', { name: 'Favorites' }) })
      .first();
    const menuSearch = menuPanel.getByPlaceholder('Search');
    await expect(menuSearch).toBeVisible();

    // Search for Nmap and launch the app.
    await menuSearch.fill('nmap');
    const nmapTile = page.getByRole('button', { name: 'Nmap NSE' }).first();
    await expect(nmapTile).toBeVisible();
    await nmapTile.dblclick();

    const nmapWindow = page.locator('#nmap-nse');
    await expect(nmapWindow).toBeVisible();

    // Move the window via dragging the title bar.
    const initialTransform = await nmapWindow.evaluate((el) => el.style.transform || '');
    const titleBar = nmapWindow.locator('.bg-ub-window-title');
    const box = await titleBar.boundingBox();
    if (!box) {
      throw new Error('Unable to determine window title bar bounds');
    }

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2 + 120, { steps: 10 });
    await page.mouse.up();

    await expect
      .poll(async () => nmapWindow.evaluate((el) => el.style.transform || ''))
      .not.toBe(initialTransform);

    // Snap the window to the left using the window event helper.
    await page.evaluate(() => {
      document
        .getElementById('nmap-nse')
        ?.dispatchEvent(new CustomEvent('super-arrow', { detail: 'ArrowLeft' }));
    });
    await expect
      .poll(async () => nmapWindow.evaluate((el) => el.style.width || ''))
      .toBe('50%');

    // Re-open the menu to launch Recon-ng for workspace switching checks.
    await page.getByRole('button', { name: APP_MENU_BUTTON }).click();
    const menuPanelTwo = page
      .locator('div')
      .filter({ has: page.getByRole('button', { name: 'Favorites' }) })
      .first();
    const reconSearch = menuPanelTwo.getByPlaceholder('Search');
    await reconSearch.fill('recon');
    const reconTile = page.getByRole('button', { name: 'Recon-ng' }).first();
    await expect(reconTile).toBeVisible();
    await reconTile.dblclick();

    const reconWindow = page.locator('#recon-ng');
    await expect(reconWindow).toBeVisible();

    const addWorkspace = reconWindow.getByRole('button', { name: '+' });
    await addWorkspace.click();
    const workspaceTwo = reconWindow.getByRole('button', { name: 'Workspace 2' });
    await expect(workspaceTwo).toBeVisible();
    await workspaceTwo.click();
    await expect(workspaceTwo).toHaveClass(/bg-blue-600/);

    // Settings can be launched from the dock shortcuts.
    await page.locator('nav[aria-label="Dock"]').getByRole('button', { name: 'Settings' }).click();
    const settingsWindow = page.locator('#settings');
    await expect(settingsWindow).toBeVisible();

    // Toggle the theme from Quick Settings.
    const statusButton = page.getByRole('button', { name: 'System status' });
    await statusButton.click();
    const themeToggle = page.getByRole('button', { name: /Theme/ });
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
