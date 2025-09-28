import { test, expect, type Page } from '@playwright/test';

const isFocusInside = async (page: Page, selector: string) =>
  page.evaluate((dialogSelector) => {
    const active = document.activeElement;
    if (!active) return false;
    return Boolean(active.closest(dialogSelector));
  }, selector);

test.describe('dialog focus management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('quick settings traps focus and restores the trigger', async ({ page }) => {
    const statusButton = page.locator('#status-bar');
    await statusButton.focus();
    await statusButton.click();

    const quickSettings = page.locator('[data-testid="quick-settings"]');
    await expect(quickSettings).toBeVisible();

    const themeToggle = quickSettings.locator('button').first();
    await expect(themeToggle).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    const toggles = quickSettings.locator('input[type="checkbox"]');
    const toggleCount = await toggles.count();
    await expect(toggles.nth(Math.max(0, toggleCount - 1))).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(themeToggle).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(quickSettings).toBeHidden();
    await expect(statusButton).toBeFocused();
  });

  test('launcher keeps focus within the menu and returns focus on close', async ({ page }) => {
    const launcherButton = page.getByRole('button', { name: 'Applications' });
    await launcherButton.focus();
    await launcherButton.click();

    const launcher = page.locator('[data-testid="whisker-menu"]');
    await expect(launcher).toBeVisible();

    const searchInput = launcher.locator('input[aria-label="Search applications"]');
    await expect(searchInput).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(await isFocusInside(page, '[data-testid="whisker-menu"]')).toBe(true);

    await page.keyboard.press('Escape');
    await expect(launcher).toHaveCount(0);
    await expect(launcherButton).toBeFocused();
  });

  test('window switcher retains focus while open and restores the trigger on exit', async ({ page }) => {
    const statusButton = page.locator('#status-bar');
    await statusButton.focus();

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'terminal' }));
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'calculator' }));
    });

    await page.waitForSelector('#terminal');
    await page.waitForSelector('#calculator');

    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', { key: 'Tab', altKey: true, bubbles: true });
      document.dispatchEvent(event);
    });

    const switcher = page.locator('[data-testid="window-switcher"]');
    await expect(switcher).toBeVisible();

    const search = switcher.locator('input[placeholder="Search windows"]');
    await expect(search).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(search).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(switcher).toHaveCount(0);
    await expect(statusButton).toBeFocused();
  });
});

