import { test, expect } from '@playwright/test';

// Verify a desktop application opens from the applications grid.
test('launches terminal app from application grid', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  await page.goto('/');
  await page.locator('nav [aria-label="Show Applications"]').click();
  await page.locator('#app-terminal').click();

  const windowLocator = page.locator('[data-app-id="terminal"]');
  await expect(windowLocator).toBeVisible();

  expect(consoleErrors, `Console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});
