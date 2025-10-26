import { expect, test } from '@playwright/test';
import { contrastRatio } from './utils';

test.describe('Design portal micro-interactions', () => {
  test('shimmer preview maintains accessible contrast', async ({ page }) => {
    await page.goto('/apps/design-portal');
    await page.waitForSelector('[data-testid="shimmer-preview"]');
    const colors = await page.$eval('[data-testid="shimmer-preview"] p:last-of-type', (element) => {
      const textStyles = window.getComputedStyle(element as HTMLElement);
      const container = (element.closest('[data-testid="shimmer-preview"]') ?? element.parentElement) as HTMLElement;
      const containerStyles = window.getComputedStyle(container);
      return {
        fg: textStyles.color,
        bg: containerStyles.backgroundColor || 'rgb(0, 0, 0)',
      };
    });

    const ratio = contrastRatio(colors.fg, colors.bg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  test('reduced motion disables animated shimmer and press transforms', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/apps/design-portal');

    await page.waitForSelector('[data-testid="shimmer-preview"]');
    const shimmerAnimation = await page.$eval('[data-testid="shimmer-preview"]', (element) => {
      const styles = window.getComputedStyle(element as HTMLElement);
      return {
        name: styles.animationName,
        duration: styles.animationDuration,
      };
    });
    expect(shimmerAnimation.name === 'none' || Number.parseFloat(shimmerAnimation.duration) === 0).toBeTruthy();

    const pressButton = page.getByRole('button', { name: 'Press to confirm' });
    const before = await pressButton.evaluate((el) => window.getComputedStyle(el).transform);
    await pressButton.dispatchEvent('pointerdown');
    await page.waitForTimeout(50);
    const after = await pressButton.evaluate((el) => window.getComputedStyle(el).transform);
    await pressButton.dispatchEvent('pointerup');
    const acceptable = new Set(['none', 'matrix(1, 0, 0, 1, 0, 0)']);
    expect(acceptable.has(after)).toBeTruthy();
  });
});
