import { test, expect } from '@playwright/test';

test.describe('Preferred Applications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/preferred-apps');
  });

  test('changing default browser updates URL handlers', async ({ page }) => {
    await page.selectOption('select#default-browser', { label: 'Chromium' });
    await expect(page.locator('[data-testid="url-handler-http"]')).toHaveText('Chromium');
    await expect(page.locator('[data-testid="url-handler-https"]')).toHaveText('Chromium');
  });

  test('changing default terminal updates Open With list', async ({ page }) => {
    await page.selectOption('select#default-terminal', { label: 'TTY' });
    await page.click('button#open-with');
    await expect(page.locator('[data-testid="open-with-terminal"]')).toHaveText('TTY');
  });
});
