import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Login greeter accessibility', () => {
  test('meets WCAG AA guidelines on initial load', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('main')
      .analyze();

    const seriousViolations = results.violations.filter((violation) =>
      ['critical', 'serious'].includes(violation.impact ?? 'minor'),
    );

    expect(seriousViolations).toEqual([]);
  });

  test('toggles announce state changes and update the interface', async ({ page }) => {
    await page.goto('/login');

    const announcements = page.getByTestId('announcement-region');
    await expect(announcements).toContainText('Greeter loaded');

    const highContrastToggle = page.getByRole('button', { name: 'High contrast theme' });
    const screenReaderToggle = page.getByRole('button', { name: 'Screen reader hints' });
    const keyboardToggle = page.getByRole('button', { name: 'Keyboard navigation guide' });

    await highContrastToggle.click();
    await expect(announcements).toContainText('High contrast theme enabled');

    const isHighContrast = await page.evaluate(() => document.body.classList.contains('high-contrast'));
    expect(isHighContrast).toBe(true);

    await screenReaderToggle.click();
    await expect(announcements).toContainText('Screen reader hints enabled');

    const describedByValue = await page.locator('#login-main').getAttribute('aria-describedby');
    const describedBy = describedByValue ? describedByValue.split(' ') : [];
    expect(describedBy).toContain('screen-reader-instructions');

    await keyboardToggle.click();
    await expect(announcements).toContainText('Keyboard navigation guide enabled');

    const focusGuide = page.locator('#keyboard-focus-guide');
    await expect(focusGuide).toBeVisible();

    const hasKeyboardClass = await page.evaluate(() => document.body.classList.contains('keyboard-nav-mode'));
    expect(hasKeyboardClass).toBe(true);
  });
});
