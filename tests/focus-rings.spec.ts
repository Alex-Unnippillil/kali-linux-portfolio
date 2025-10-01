import { expect, test } from '@playwright/test';

const getActiveSummary = () =>
  document.activeElement
    ? `${
        (document.activeElement as HTMLElement).ariaLabel ?? ''
      }|${document.activeElement.textContent?.trim() ?? ''}`
    : '';

test.describe('Focus ring styling', () => {
  test('keyboard navigation shows focus ring on popular modules controls', async ({ page }) => {
    await page.goto('/popular-modules');

    // Move focus through the page until the "Update Modules" button is active.
    for (let i = 0; i < 15; i += 1) {
      await page.keyboard.press('Tab');
      const summary = await page.evaluate(getActiveSummary);
      if (summary.toLowerCase().includes('update modules')) {
        break;
      }
    }

    const metrics = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) {
        throw new Error('No focused element');
      }
      const style = getComputedStyle(el);
      return {
        outlineColor: style.outlineColor,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
      };
    });

    expect(metrics.outlineWidth).toBe('2px');
    expect(metrics.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(metrics.boxShadow).toContain('rgb');
  });

  test('focus ring tokens respond to high contrast mode', async ({ page }) => {
    await page.goto('/');

    const defaultColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--focus-ring-color')
        .trim()
    );

    await page.evaluate(() => {
      document.documentElement.classList.add('high-contrast');
    });

    const highContrastColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--focus-ring-color')
        .trim()
    );

    expect(defaultColor).not.toEqual('');
    expect(highContrastColor).not.toEqual('');
    expect(defaultColor).not.toEqual(highContrastColor);
  });
});
