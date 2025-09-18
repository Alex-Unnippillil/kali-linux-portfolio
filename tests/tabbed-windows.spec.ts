import { test, expect } from '@playwright/test';

const windowLocator = '[data-testid="tabbed-window"]';

test.describe('terminal tabbed windows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/apps/terminal');
    await page.waitForSelector(windowLocator);
  });

  test('creates a new session tab', async ({ page }) => {
    const tabs = page.locator(windowLocator).first().locator('[role="tab"]');
    const initialCount = await tabs.count();
    await page
      .locator(windowLocator)
      .first()
      .locator('button[aria-label="New tab"]')
      .click();
    await expect(tabs).toHaveCount(initialCount + 1);
  });

  test('detaches and merges tabs across windows', async ({ page }) => {
    const windows = page.locator(windowLocator);
    await expect(windows).toHaveCount(1);

    const firstTab = windows.first().locator('[role="tab"]').first();
    await firstTab.dragTo(page.locator('body'), { force: true });
    await expect(windows).toHaveCount(2);

    const secondWindowTab = windows.nth(1).locator('[role="tab"]').first();
    const firstWindowTablist = windows.first().locator('[role="tablist"]');
    await secondWindowTab.dragTo(firstWindowTablist, { force: true });
    await expect(windows).toHaveCount(1);
  });
});
