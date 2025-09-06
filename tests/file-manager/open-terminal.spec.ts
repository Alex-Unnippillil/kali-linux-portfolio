import { test, expect } from '@playwright/test';

test.describe('File manager - open terminal', () => {
  test('launches preferred terminal from context menu', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('preferred-terminal', 'serial-terminal');
    });

    await page.goto('/');

    await page.getByRole('button', { name: 'Files' }).click();

    const filesWindow = page.getByRole('dialog', { name: 'Files' });
    await filesWindow.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Open in Terminal' }).click();

    await expect(page.getByRole('dialog', { name: 'Serial Terminal' })).toBeVisible();
  });
});

