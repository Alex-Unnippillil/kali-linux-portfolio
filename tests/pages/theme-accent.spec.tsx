import { test, expect } from '@playwright/test';

const accentColor = '#e53e3e';
const themeValue = 'dark';

test('theme and accent persist across reloads', async ({ page }) => {
  await page.goto('/apps/settings');

  const themeSelect = page.locator('select').first();
  await themeSelect.selectOption(themeValue);
  await expect(themeSelect).toHaveValue(themeValue);

  const accentOption = page.getByRole('radio', { name: `select-accent-${accentColor}` });
  await accentOption.click();
  await expect(accentOption).toHaveAttribute('aria-checked', 'true');

  await page.waitForTimeout(1000);
  await page.reload();

  await expect(themeSelect).toHaveValue(themeValue);
  await expect(page.getByRole('radio', { name: `select-accent-${accentColor}` })).toHaveAttribute('aria-checked', 'true');

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeValue);
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
  );
  expect(accent).toBe(accentColor);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeValue);
  const accent2 = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
  );
  expect(accent2).toBe(accentColor);
});
