import { test, expect } from '@playwright/test';

test('kali purple page has correct description and learn more link', async ({ page }) => {
  await page.goto('/kali-purple');

  await expect(page.locator('body')).toContainText(
    'The dawn of a new era. Kali is not only Offense, but starting to be defense',
  );

  const learnMore = page.getByRole('link', { name: /learn more/i });
  await expect(learnMore).toHaveAttribute(
    'href',
    'https://www.kali.org/blog/kali-linux-2023-1-release/',
  );
});
