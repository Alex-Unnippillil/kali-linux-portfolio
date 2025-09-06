import { test, expect } from '@playwright/test';

test.describe('file manager run scripts', () => {
  test('shows Run/Edit/Cancel prompt for executable scripts', async ({ page }) => {
    await page.goto('/apps/files');

    // Enable prompt when opening executable text files
    await page.getByRole('button', { name: /preferences/i }).click();
    await page.getByLabel(/executable text files/i).check();
    await page.getByRole('button', { name: /close/i }).click();

    // Open an executable script (first .sh file in listing)
    await page.getByText(/\.sh$/).first().dblclick();

    // Assert Run/Edit/Cancel prompt
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Run' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });
});
