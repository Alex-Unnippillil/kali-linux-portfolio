import { test, expect } from '@playwright/test';

test.describe('Undercover tooltip', () => {
  test('mentions Windows-like theme and docs link', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByLabel(/undercover/i).first();
    await trigger.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toContainText('Windows-like theme');
    const docLink = tooltip.locator('a');
    await expect(docLink).toHaveAttribute('href', /undercover/);
  });
});
