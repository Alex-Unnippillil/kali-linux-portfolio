import { test, expect } from '@playwright/test';
import { scanForContrastViolations } from '../modules/a11y/contrast-scan';

const ROUTES = ['/', '/apps'];
const IGNORE_ATTRIBUTE = 'data-contrast-overlay';

type ContrastViolation = {
  type: string;
  ratio: number;
  path: string;
  foreground: string;
  background: string;
};

const formatViolations = (violations: ContrastViolation[]) =>
  violations.map((violation) => ({
    type: violation.type,
    ratio: violation.ratio.toFixed(2),
    path: violation.path,
    foreground: violation.foreground,
    background: violation.background,
  }));

for (const route of ROUTES) {
  test(`has accessible contrast on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    const violations: ContrastViolation[] = await page.evaluate(scanForContrastViolations, {
      ignoreAttribute: IGNORE_ATTRIBUTE,
    });

    if (violations.length > 0) {
      console.table(formatViolations(violations));
    }

    expect(violations, `Contrast violations detected on ${route}`).toEqual([]);
  });
}
