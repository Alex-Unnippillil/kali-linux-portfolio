import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const accessibilityThreshold = 95;

const penaltyByImpact: Record<string, number> = {
  critical: 60,
  serious: 40,
  moderate: 10,
  minor: 5,
};

test.describe('Terminal accessibility regression', () => {
  test('meets Lighthouse-inspired score on /apps/terminal', async ({ page }) => {
    await page.goto('http://localhost:3000/apps/terminal');

    const snapshot = await page.accessibility.snapshot();
    expect(snapshot).toBeTruthy();

    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const penalty = axeResults.violations.reduce((total, violation) => {
      const impact = violation.impact || 'minor';
      return total + (penaltyByImpact[impact] ?? penaltyByImpact.minor);
    }, 0);

    const score = Math.max(0, 100 - penalty);
    expect(score).toBeGreaterThanOrEqual(accessibilityThreshold);
  });
});
