import { test, expect } from '@playwright/test';

test.use({ baseURL: 'https://www.kali.org', ignoreHTTPSErrors: true });

test.describe('release carousel', () => {
  test('cycles releases and links to posts', async ({ page }) => {
    await page.goto('/releases/');

    // Explicit historic releases that should always be present.
    const releases = [
      {
        version: 'Kali 2019.4',
        url: 'https://www.kali.org/blog/kali-linux-2019-4-release/',
      },
      {
        version: 'Kali 2023.1',
        url: 'https://www.kali.org/blog/kali-linux-2023-1-release/',
      },
    ];

    for (const { version, url } of releases) {
      const item = page.locator('li', { hasText: version }).first();
      await expect(item).toBeVisible();
      await expect(item.locator(`a[href="${url}"]`)).toBeVisible();
    }

    // The first release listed should be the current one and link to a blog post.
    const current = page.locator('li', { hasText: /^Kali\s+\d{4}\.\d/ }).first().locator('a').first();
    await expect(current).toHaveAttribute('href', /kali-linux-[0-9.-]+-release/);
  });
});
