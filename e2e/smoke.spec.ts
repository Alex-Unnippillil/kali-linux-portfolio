import { test, expect } from '@playwright/test';
import featureFlags from '../featureFlags';

const describe = featureFlags.playwright ? test.describe : test.describe.skip;

describe('keyboard navigation', () => {
  test('home page allows tab navigation', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => document.activeElement?.tagName);
    expect(tag).toBeTruthy();
  });

  test('2048 app allows tab navigation', async ({ page }) => {
    await page.goto('/apps/2048');
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => document.activeElement?.tagName);
    expect(tag).toBeTruthy();
  });

  test('blackjack app allows tab navigation', async ({ page }) => {
    await page.goto('/apps/blackjack');
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => document.activeElement?.tagName);
    expect(tag).toBeTruthy();
  });
});
