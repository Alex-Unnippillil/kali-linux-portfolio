import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Overlay accessibility', () => {
  test('nested overlays trap focus and remain accessible', async ({ page }) => {
    await page.goto('/tests/overlays');

    const openOuter = page.getByRole('button', { name: 'Open outer modal' });
    await openOuter.click();
    await expect(page.getByRole('dialog', { name: 'Outer modal' })).toBeVisible();

    const openInner = page.getByRole('button', { name: 'Open inner modal' });
    await openInner.click();
    await expect(page.getByRole('dialog', { name: 'Inner modal' })).toBeVisible();
    await expect(page.locator('#inner-close')).toBeFocused();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const blocking = results.violations.filter(
      violation => violation.impact === 'critical' || violation.impact === 'serious',
    );
    expect(blocking, 'nested overlays must not introduce serious accessibility issues').toHaveLength(0);

    await page.locator('#inner-close').click();
    await expect(page.locator('#open-inner')).toBeFocused();

    await page.locator('#outer-close').click();
    await expect(openOuter).toBeFocused();
  });
});
