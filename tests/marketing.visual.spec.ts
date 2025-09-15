import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

const pages = [
  { url: '/', name: 'home' },
  { url: '/security-education', name: 'security-education' },
  { url: '/popular-modules', name: 'popular-modules' },
];

for (const { url, name } of pages) {
  test(`${name} visual snapshot`, async ({ page }) => {
    await page.goto(url);
    await percySnapshot(page, name, { threshold: 0.1 });
  });
}
