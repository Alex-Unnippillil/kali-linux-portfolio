import { test, expect } from '@playwright/test';

// Ensure tools that are part of Kali metapackages display
// badges linking to their package information page.
test('metapackage tools expose package badges', async ({ page }) => {
  await page.goto('/tools/nmap');

  // Locate all metapackage badges linking to the kali-meta page
  const badgeLinks = page.locator('#metapackages a[href*="kali-meta"]');

  // At least one badge should be present
  const count = await badgeLinks.count();
  expect(count).toBeGreaterThan(0);

  // Each badge should link to package info under kali-meta
  const hrefs = await badgeLinks.allAttribute('href');
  for (const href of hrefs) {
    expect(href).toContain('kali-meta');
  }
});
