import { expect, Locator, Page } from '@playwright/test';

const DESKTOP_BOOT_KEYS = {
  booting: 'booting_screen',
  locked: 'screen-locked',
  shutdown: 'shut-down',
};

export const seedDesktopPreferences = async (page: Page): Promise<void> => {
  await page.addInitScript(({ keys }) => {
    try {
      window.localStorage.setItem(keys.booting, 'false');
      window.localStorage.setItem(keys.locked, 'false');
      window.localStorage.setItem(keys.shutdown, 'false');
    } catch (error) {
      // Best effort guard for storage access issues in playwright
    }
  }, { keys: DESKTOP_BOOT_KEYS });
};

export const gotoDesktop = async (page: Page): Promise<void> => {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.locator('#window-area').waitFor({ state: 'attached', timeout: 30_000 });
};

export const openDesktopWindow = async (
  page: Page,
  appId: string,
  title: string,
): Promise<Locator> => {
  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
  }, appId);

  const windowLocator = page.getByRole('dialog', { name: title });
  await expect(windowLocator).toBeVisible({ timeout: 15_000 });
  return windowLocator;
};

