import { test, expect } from '@playwright/test';

test('quick play start and pause freeze', async ({ page }) => {
  await page.goto('/apps/tower-defense');
  const waveStatus = page.getByTestId('tower-defense-wave');

  await page.getByRole('button', { name: 'Start Waves' }).click();
  await expect(waveStatus).toContainText('Next wave in', { timeout: 5000 });
  await expect(waveStatus).toContainText('enemies active', { timeout: 7000 });

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();

  const frozenStatus = await waveStatus.textContent();
  await page.waitForTimeout(1000);
  await expect(waveStatus).toHaveText(frozenStatus ?? '', { timeout: 2000 });
});
