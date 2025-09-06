import { test, expect } from '@playwright/test';

test.describe('File manager thumbnails', () => {
  test('over-limit file uses generic icon and resetting updates immediately', async ({ page }) => {
    await page.setContent('<div id="app"></div>');

    await page.addScriptTag({
      content: `
        window.thumbLimit = Infinity;
        window.setThumbLimit = (n) => { window.thumbLimit = n; };
        window.getIconForSize = (size) => size > window.thumbLimit ? 'generic' : 'thumbnail';
      `,
    });

    await page.evaluate(() => window.setThumbLimit(1));
    let icon = await page.evaluate(() => window.getIconForSize(5));
    expect(icon).toBe('generic');

    await page.evaluate(() => window.setThumbLimit(10));
    icon = await page.evaluate(() => window.getIconForSize(5));
    expect(icon).toBe('thumbnail');
  });
});
