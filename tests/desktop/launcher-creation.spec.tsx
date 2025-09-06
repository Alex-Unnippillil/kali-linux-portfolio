import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Drag an application from the app finder to the desktop and ensure a
 * corresponding `.desktop` launcher file is created. Finally verify that the
 * launcher can be edited from its context menu.
 */
test('create desktop launcher from app finder', async ({ page }) => {
  // Open the desktop and reveal the App Finder ("Show Applications" button).
  await page.goto('/');
  await page.locator('nav [aria-label="Show Applications"]').click();

  const appId = 'gedit';
  const appTile = page.locator(`#app-${appId}`);
  const desktopArea = page.locator('#desktop');

  // Drag the application tile onto the desktop area.
  await appTile.dragTo(desktopArea);

  // Expect a .desktop file to be created for the dragged application.
  const desktopFile = path.join(process.env.HOME || '', 'Desktop', `${appId}.desktop`);
  await expect
    .poll(() => fs.existsSync(desktopFile), {
      message: `${desktopFile} should exist`,
    })
    .toBe(true);

  // Open the context menu on the newly created desktop icon and choose Edit.
  const desktopIcon = desktopArea.locator(`#app-${appId}`);
  await desktopIcon.click({ button: 'right' });
  await page.locator('text=Edit').click();

  // The editor should open; assert an editor window is visible.
  await expect(page.locator('[data-app-id="gedit"]')).toBeVisible();
});
