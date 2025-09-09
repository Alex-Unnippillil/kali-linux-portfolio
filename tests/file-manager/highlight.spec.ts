import { test, expect, Page } from '@playwright/test';

// Utility function to set color inputs and save
async function setColors(page: Page, foreground: string, background: string) {
  await page.fill('input[name="foreground"]', foreground);
  await page.fill('input[name="background"]', background);
  await page.click('text=Save');
}

test('can highlight item with custom colors and clear them', async ({ page }) => {
  await page.goto('/apps/file-explorer');

  const item = page.locator('[data-testid="file-item"]').first();
  const defaultColor = await item.evaluate((el) => getComputedStyle(el).color);
  const defaultBg = await item.evaluate((el) => getComputedStyle(el).backgroundColor);

  await item.click({ button: 'right' });
  await page.click('text=Properties');
  await setColors(page, '#ff0000', '#00ff00');

  await expect(item).toHaveCSS('color', 'rgb(255, 0, 0)');
  await expect(item).toHaveCSS('background-color', 'rgb(0, 255, 0)');

  await item.click({ button: 'right' });
  await page.click('text=Properties');
  await setColors(page, '', '');

  await expect(item).toHaveCSS('color', defaultColor);
  await expect(item).toHaveCSS('background-color', defaultBg);
});
