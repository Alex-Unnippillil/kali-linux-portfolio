import { test, expect } from '@playwright/test';

test.describe('Touch mode experience', () => {
  test('enables touch mode and shows the touch keyboard on focus', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');

    await page.locator('#status-bar').click();
    const touchToggle = page.getByTestId('quick-settings-touch');
    await expect(touchToggle).toBeVisible();

    const initialClass = await html.getAttribute('class');
    if (initialClass?.includes('touch-mode')) {
      await touchToggle.click();
      await expect(html).not.toHaveAttribute('class', /touch-mode/);
    }

    await touchToggle.click();
    await expect(html).toHaveAttribute('class', /touch-mode/);

    await page.locator('#status-bar').click();

    await page.getByRole('button', { name: /applications/i }).click();
    const searchInput = page.getByPlaceholder('Search');
    await expect(searchInput).toBeVisible();

    await searchInput.click();
    const keyboard = page.getByTestId('touch-keyboard');
    await expect(keyboard).toHaveAttribute('data-state', 'open');

    await page.getByTestId('touch-keyboard-key-a').click();
    await expect(searchInput).toHaveValue(/a$/i);

    await page.getByTestId('touch-keyboard-hide').click();
    await expect(keyboard).toHaveAttribute('data-state', 'closed');
  });
});
