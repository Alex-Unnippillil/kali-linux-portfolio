import { test, expect } from '@playwright/test';

const OFFICIAL_URL = 'https://store.nethunter.com/en/';

test('NetHunter App Store button is prominent and opens official site', async ({ page }) => {
  await page.goto('/nethunter-appstore');

  const button = page.getByRole('link', { name: /kali nethunter app store/i });

  // ensure the button is visible and within the initial viewport
  await expect(button).toBeVisible();
  await expect(button).toBeInViewport();

  // ensure the button points to the official NetHunter App Store
  await expect(button).toHaveAttribute('href', OFFICIAL_URL);
});

