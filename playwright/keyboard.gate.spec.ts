import { expect, test, type Locator, type Page } from '@playwright/test';

type FocusOptions = {
  direction?: 'forward' | 'backward';
  maxPresses?: number;
};

const focusByTab = async (
  page: Page,
  target: Locator,
  { direction = 'forward', maxPresses = 60 }: FocusOptions = {},
) => {
  await target.waitFor({ state: 'attached' });

  for (let i = 0; i <= maxPresses; i += 1) {
    const isFocused = await target
      .evaluate((element) => element === document.activeElement)
      .catch(() => false);

    if (isFocused) {
      return;
    }

    await page.keyboard.press(direction === 'backward' ? 'Shift+Tab' : 'Tab');
  }

  throw new Error(`Unable to move focus to ${target.toString()}`);
};

test.describe('keyboard gate navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booting_screen', 'false');
      window.localStorage.setItem('screen-locked', 'false');
      window.localStorage.setItem('shut-down', 'false');
      window.localStorage.removeItem('recentApps');
    });

    await page.goto('/');
    await expect(page.locator('nav[aria-label="Dock"]')).toBeVisible();
  });

  test('keyboard-only desktop, launcher, settings, and notification flows', async ({ page }) => {
    const focus = (locator: Locator, options?: FocusOptions) =>
      focusByTab(page, locator, options);

    const aboutWindow = page.locator('#about-alex[role="dialog"]');
    await expect(aboutWindow).toBeVisible();
    await focus(aboutWindow);
    await page.keyboard.press('Escape');
    await expect(aboutWindow).toBeHidden();

    const aboutIcon = page.locator('#app-about-alex');
    await focus(aboutIcon);
    await expect(aboutIcon).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(aboutWindow).toBeVisible();
    await focus(aboutWindow);
    await page.keyboard.press('Escape');
    await expect(aboutWindow).toBeHidden();

    const applicationsButton = page.locator('button:has-text("Applications")');
    await focus(applicationsButton);
    await expect(applicationsButton).toBeFocused();
    await page.keyboard.press('Enter');

    const launcherSearch = page.locator('input[placeholder="Search"]');
    await expect(launcherSearch).toBeVisible();
    await expect(launcherSearch).toBeFocused();
    await page.keyboard.type('settings');
    await page.keyboard.press('Enter');

    const settingsWindow = page.locator('#settings[role="dialog"]');
    await expect(settingsWindow).toBeVisible();
    await focus(settingsWindow);

    const themeSelect = settingsWindow.locator('select').first();
    await focus(themeSelect);
    const initialTheme = await themeSelect.inputValue();
    await page.keyboard.press('ArrowDown');
    await expect
      .poll(async () => themeSelect.inputValue(), {
        timeout: 2000,
      })
      .not.toBe(initialTheme);

    await page.keyboard.press('Escape');
    await expect(settingsWindow).toBeHidden();

    const statusButton = page.locator('#status-bar');
    await focus(statusButton);
    await expect(statusButton).toBeFocused();
    await page.keyboard.press('Enter');

    const quickSettingsTheme = page.locator('button:has-text("Theme")');
    await expect(quickSettingsTheme).toBeVisible();
    await focus(quickSettingsTheme);

    const html = page.locator('html');
    const themeBefore = await html.evaluate((element) => element.classList.contains('dark'));
    const labelBefore = await quickSettingsTheme.locator('span').last().textContent();

    await page.keyboard.press('Space');

    await expect
      .poll(async () => html.evaluate((element) => element.classList.contains('dark')))
      .not.toBe(themeBefore);
    await expect
      .poll(async () => quickSettingsTheme.locator('span').last().textContent())
      .not.toBe(labelBefore ?? '');

    await focus(statusButton, { direction: 'backward', maxPresses: 10 });
    await page.keyboard.press('Enter');
    await expect(quickSettingsTheme).toBeHidden();
    await expect(statusButton).toBeFocused();
  });
});
