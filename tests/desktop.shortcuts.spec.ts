import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const gotoDesktop = async (page: Page) => {
  await page.goto('/');
  await page.waitForSelector('#desktop');
  await page.waitForSelector('#about-alex');
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('booting_screen', 'false');
    window.localStorage.setItem('screen-locked', 'false');
    window.localStorage.setItem('shut-down', 'false');
  });
});

test('Alt+Tab opens the switcher and cycles focus', async ({ page }) => {
  await gotoDesktop(page);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: 'terminal' }));
  });
  const aboutWindow = page.locator('#about-alex');
  const terminalWindow = page.locator('#terminal');
  await expect(terminalWindow).toBeVisible();

  await page.keyboard.down('Alt');
  try {
    await page.keyboard.press('Tab');
    await expect(page.locator('input[placeholder="Search windows"]')).toBeVisible();
  } finally {
    await page.keyboard.up('Alt');
  }

  await expect(aboutWindow).not.toHaveClass(/notFocused/);
  await expect(terminalWindow).toHaveClass(/notFocused/);
});

test('Win key toggles the applications overview', async ({ page }) => {
  await gotoDesktop(page);
  const overlay = page.locator('.all-apps-anim');

  await page.keyboard.down('Meta');
  await page.keyboard.up('Meta');
  await expect(overlay).toBeVisible();

  await page.keyboard.down('Meta');
  await page.keyboard.up('Meta');
  await expect(overlay).toHaveCount(0);
});

test('Ctrl+` summons the terminal window', async ({ page }) => {
  await gotoDesktop(page);
  await page.keyboard.press('Control+Backquote');
  await expect(page.locator('#terminal')).toBeVisible();
});

test('Ctrl+` is ignored while typing in an input', async ({ page }) => {
  await gotoDesktop(page);
  await page.keyboard.down('Meta');
  await page.keyboard.up('Meta');

  const searchInput = page.locator('.all-apps-anim input[placeholder="Search"]');
  await expect(searchInput).toBeVisible();
  await searchInput.click();
  await searchInput.type('demo');

  await page.keyboard.press('Control+Backquote');
  await expect(page.locator('#terminal')).toHaveCount(0);
});

test('apps can cancel global shortcuts', async ({ page }) => {
  await gotoDesktop(page);
  await page.evaluate(() => {
    window.addEventListener('global-shortcuts:before-handle', (event) => {
      if (event.detail?.action === 'ctrl-backtick') {
        event.preventDefault();
      }
    });
  });

  await page.keyboard.press('Control+Backquote');
  await expect(page.locator('#terminal')).toHaveCount(0);
});
