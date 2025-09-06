import { test, expect } from '@playwright/test';

// Verify mock device insertion shows toast, opens folder and eject removes sidebar device.

test.describe('Volume management', () => {
  test('mock device insert and eject', async ({ context }) => {
    const explorer = await context.newPage();
    await explorer.goto('/apps/file-explorer');

    const settings = await context.newPage();
    await settings.goto('/apps/settings/removable-media');

    // Insert device
    await settings.getByRole('button', { name: 'Insert mock device' }).click();
    await expect(settings.getByText('Demo USB inserted')).toBeVisible();
    await expect(explorer.getByText('Mounted Demo USB')).toBeVisible();
    await expect(explorer.getByText('Demo USB')).toBeVisible();

    // Eject device
    await settings.getByRole('button', { name: 'Eject device' }).click();
    await expect(explorer.getByText('Demo USB')).toHaveCount(0);
  });
});
