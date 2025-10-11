import { test, expect } from '@playwright/test';

const waitForTour = async (page) => {
  const tour = page.getByRole('dialog', { name: 'Desktop tour' });
  await expect(tour).toBeVisible();
  return tour;
};

test('desktop tour runs on first load and can be replayed', async ({ page }) => {
  await page.goto('/');

  const tour = await waitForTour(page);
  await expect(tour.getByText('Applications menu')).toBeVisible();

  await tour.getByRole('button', { name: 'Next' }).click();
  await expect(tour.getByText('System status & quick settings')).toBeVisible();

  await tour.getByRole('button', { name: 'Next' }).click();
  const finishButton = tour.getByRole('button', { name: 'Finish tour' });
  await expect(tour.getByText('Workspace & windows')).toBeVisible();
  await finishButton.click();

  await expect(page.getByRole('dialog', { name: 'Desktop tour' })).toHaveCount(0);

  await expect
    .poll(async () => page.evaluate(() => window.localStorage.getItem('desktop-tour-complete')))
    .toBe('true');

  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Desktop tour' })).toHaveCount(0);

  await page.locator('#status-bar').click();
  const replayButton = page.getByRole('button', { name: 'Replay desktop tour' });
  await expect(replayButton).toBeVisible();
  await expect(replayButton).toBeEnabled();
  await replayButton.click();

  const replayTour = await waitForTour(page);
  await replayTour.getByRole('button', { name: 'Skip tour' }).click();

  await expect(page.getByRole('dialog', { name: 'Desktop tour' })).toHaveCount(0);
});
