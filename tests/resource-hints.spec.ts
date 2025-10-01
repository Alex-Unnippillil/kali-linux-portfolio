import { test, expect } from '@playwright/test';

const hintExpectations: Record<string, string[]> = {
  '/': ['/apps', '/profile', '/security-education'],
  '/apps': ['/apps/terminal', '/apps/weather', '/apps/checkers'],
  '/apps/terminal': ['/apps/settings', '/apps/ssh'],
  '/security-education': ['/post_exploitation', '/network-topology'],
};

for (const [route, expectedHrefs] of Object.entries(hintExpectations)) {
  test(`emits resource hints for ${route}`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.ok()).toBeTruthy();

    for (const href of expectedHrefs) {
      const locator = page.locator(`head > link[rel="prefetch"][href$="${href}"]`);
      await expect(locator, `${route} should hint ${href}`).toHaveCount(1);
    }
  });
}
