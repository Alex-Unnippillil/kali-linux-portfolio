import { test, expect } from '@playwright/test';

const apps = ['chrome', 'terminal', 'wireshark', 'ghidra'];

test('launch desktop apps without console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  await page.goto('/');

  for (const app of apps) {
    await page.locator('nav [aria-label="Show Applications"]').click();
    await page.locator(`#app-${app}`).click();
    const windowLocator = page.locator(`[data-app-id="${app}"]`);
    await expect(windowLocator).toBeVisible();
    await windowLocator.locator('[aria-label="Window close"]').click();
    await expect(windowLocator).toBeHidden();
  }

  expect(consoleErrors, `Console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});

