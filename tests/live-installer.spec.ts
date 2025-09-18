import { test, expect } from '@playwright/test';

test.describe('Live Installer wizard', () => {
  test('walks through the simulation and verification flow', async ({ page }) => {
    await page.goto('http://localhost:3000/apps/live-installer');

    await expect(
      page.getByRole('heading', { name: /Live USB Installer \(Simulation\)/i }),
    ).toBeVisible();
    await expect(page.getByText(/Data loss warning/i)).toBeVisible();

    await expect(
      page.getByLabel('Portable SSD • 128 GB NVMe enclosure'),
    ).toBeChecked();

    await page.getByRole('button', { name: 'Next' }).click();
    const slider = page.getByRole('slider', { name: 'Persistent storage size' });
    await expect(slider).toHaveValue('8');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByLabel(/ext4/i)).toBeChecked();

    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Start simulation' }).click();

    await page.waitForSelector('text=Simulation complete', { timeout: 15000 });
    await page.waitForSelector('text=Start verification', { timeout: 5000 });

    await page.getByRole('button', { name: 'Start verification' }).click();
    await page.waitForSelector('text=Verification failed', { timeout: 5000 });
    await page.getByRole('button', { name: 'Retry verification' }).click();

    await page.waitForSelector('text=All checks passed', { timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Finish' })).toBeEnabled();
  });
});
