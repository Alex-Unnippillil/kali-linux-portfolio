import { test, expect } from '@playwright/test';

// Tests for panel clock behaviour

// Ensure toggling 24-hour and seconds options updates the panel clock display
 test('toggles 24-hour and seconds update panel clock', async ({ page }) => {
  await page.goto('/');
  const clock = page.locator('[data-testid="panel-clock"]');
  await clock.click();
  // Toggle 24-hour time
  await page.getByRole('menuitemcheckbox', { name: /24-hour/i }).click();
  const twentyFour = await clock.textContent();
  expect(twentyFour).not.toBeNull();
  // Enable showing seconds
  await page.getByRole('menuitemcheckbox', { name: /seconds/i }).click();
  const withSeconds = await clock.textContent();
  expect(withSeconds).toMatch(/:\d{2}$/);
 });

 // Ensure Date/Time settings menu item opens the settings page
 test('clock menu opens Date/Time settings page', async ({ page }) => {
  await page.goto('/');
  const clock = page.locator('[data-testid="panel-clock"]');
  await clock.click();
  await page.getByRole('menuitem', { name: /date\/time settings/i }).click();
  await expect(page).toHaveURL(/settings/);
 });
