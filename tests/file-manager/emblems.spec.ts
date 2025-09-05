import { test, expect } from '@playwright/test';

// This test assigns an emblem to a folder via the Properties dialog
// then enables "Show folder emblems" and verifies the emblem is
// visible in both the side pane and the main list view.
//
// The test expects a file manager application to be available at
// `FILE_MANAGER_URL` (e.g., `/apps/files`). If the URL is not provided
// the test is skipped.

test.describe('Folder emblems', () => {
  test('assigns emblem via properties and displays it', async ({ page }) => {
    const url = process.env.FILE_MANAGER_URL;
    test.skip(!url, 'FILE_MANAGER_URL not defined');

    // Navigate to the file manager
    await page.goto(url!);

    // Create a folder named "Emblem Test" if it does not exist
    await page.getByRole('button', { name: /new folder/i }).click();
    await page.getByRole('textbox').fill('Emblem Test');
    await page.getByRole('textbox').press('Enter');

    // Open Properties for the folder and assign an emblem
    await page.getByText('Emblem Test').click({ button: 'right' });
    await page.getByRole('menuitem', { name: /properties/i }).click();
    await page.getByRole('tab', { name: /emblems/i }).click();
    await page.getByRole('checkbox', { name: /important/i }).check();
    await page.getByRole('button', { name: /close/i }).click();

    // Enable showing folder emblems
    await page.getByRole('menuitem', { name: /view/i }).click();
    await page.getByRole('menuitem', { name: /show folder emblems/i }).click();

    // Ensure emblem is visible in the side pane and the list view
    const paneItem = page.locator('#sidebar').getByText('Emblem Test');
    const listItem = page.locator('#file-list').getByText('Emblem Test');
    await expect(paneItem.locator('.emblem-icon')).toBeVisible();
    await expect(listItem.locator('.emblem-icon')).toBeVisible();
  });
});
