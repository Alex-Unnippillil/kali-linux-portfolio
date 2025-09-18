import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1200, height: 900 } });

test.describe('Button tokens', () => {
  test('renders button variants consistently', async ({ page }) => {
    await page.goto('/ui/button-gallery');
    const gallery = page.getByTestId('button-gallery');
    await expect(gallery).toBeVisible();
    await expect(gallery).toHaveScreenshot('button-gallery.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    });
  });
});
