import { test, expect } from '@playwright/test';

test('high contrast mode increases border visibility and text weight', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');

  const bodyFontWeight = await page.evaluate(() => getComputedStyle(document.body).fontWeight);
  expect(parseInt(bodyFontWeight, 10)).toBeGreaterThanOrEqual(600);

  const borderColor = await page.evaluate(() => {
    const div = document.createElement('div');
    div.style.border = '1px solid var(--color-border)';
    document.body.appendChild(div);
    return getComputedStyle(div).borderTopColor;
  });
  expect(borderColor).not.toBe('rgb(42, 46, 54)');
});
