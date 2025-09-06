import { test, expect } from '@playwright/test';

// Instructions for verifying Kali downloads.
// The page should guide users to check the downloaded ISO against the
// `.SHA256SUMS` file and verify the signature with Kali's official key.
// Example output for commands is included in the expectations.

test.describe('verify-downloads page', () => {
  test.skip('shows .SHA256SUMS check and Kali Linux key usage with example output', async ({ page }) => {
    await page.goto('/verify-downloads');

    // Ensure the page references the .SHA256SUMS file
    await expect(page.getByText('.SHA256SUMS')).toBeVisible();

    // Ensure Kali's official signing key is mentioned
    await expect(page.getByText(/Kali Linux.*Signing Key/i)).toBeVisible();

    // Example sha256sum output snippet
    await expect(
      page.locator('pre').filter({ hasText: /sha256sum kali-linux.*\.iso/ })
    ).toBeVisible();

    // Example gpg verification output snippet
    await expect(
      page.locator('pre').filter({ hasText: /gpg --verify SHA256SUMS\.gpg SHA256SUMS/ })
    ).toBeVisible();
  });
});
