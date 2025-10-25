import { test, expect } from '@playwright/test';

test('drawer search and theme persistence', async ({ page }) => {
  await page.goto('/');

  // Ensure menu is ready then open drawer with Meta key and search
  await page.waitForSelector('button:has-text("Applications")');
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true }));
  });
  const searchInput = page.locator('input[placeholder="Search"]');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('proj');
  await expect(page.getByText('Project Gallery', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  // Cycle theme three times
  await page.locator('#status-bar').click();
  const themeButton = page.getByRole('button', { name: /^Theme/ });
  await expect(themeButton).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await themeButton.click();
  }

  // Reload and verify dark theme persists
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.locator('#status-bar').click();
  await expect(page.getByRole('button', { name: /Theme Dark/ })).toBeVisible();
});
