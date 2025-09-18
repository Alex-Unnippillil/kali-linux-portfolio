import { test, expect, Page, Locator } from '@playwright/test';

const desktopSelectors = {
  appIcon: (page: Page, appId: string) => page.locator(`#app-${appId}`),
  taskbarButton: (page: Page, appId: string) =>
    page.locator(`[data-context="taskbar"][data-app-id="${appId}"]`),
  window: (page: Page, appId: string) =>
    page.locator(`[role="dialog"][id="${appId}"]`),
};

type KeyOptions = {
  alt?: boolean;
  shift?: boolean;
};

async function dispatchOpenApp(page: Page, appId: string) {
  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
  }, appId);
}

async function triggerClick(page: Page, selector: string) {
  await page.evaluate((sel) => {
    const target = document.querySelector(sel);
    if (!target) {
      throw new Error(`Selector not found: ${sel}`);
    }
    (target as HTMLElement).click();
  }, selector);
}

async function openWindow(page: Page, appId: string) {
  await dispatchOpenApp(page, appId);
  const windowLocator = desktopSelectors.window(page, appId);
  await expect(windowLocator, `${appId} window should appear`).toBeVisible();
  return windowLocator;
}

async function sendKey(locator: Locator, key: string, options: KeyOptions = {}) {
  await locator.evaluate(
    (element, opts) => {
      element.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: opts.key,
          altKey: opts.alt ?? false,
          shiftKey: opts.shift ?? false,
          bubbles: true,
        }),
      );
    },
    { key, alt: options.alt, shift: options.shift },
  );
}

async function getWindowStyle(locator: Locator) {
  return locator.evaluate((element) => ({
    width: parseFloat(element.style.width),
    height: parseFloat(element.style.height),
  }));
}

async function getZIndex(locator: Locator) {
  return locator.evaluate((element) => getComputedStyle(element).zIndex);
}

async function waitForDesktop(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('booting_screen', 'false');
    window.localStorage.setItem('screen-locked', 'false');
    window.localStorage.setItem('shut-down', 'false');
  });
  await page.goto('/');
  await expect(desktopSelectors.appIcon(page, 'chrome')).toBeVisible({ timeout: 45_000 });
}

test.describe('desktop window management', () => {
  test('supports focus, snap, resize, minimize, restore, and close flows', async ({ page }) => {
    await waitForDesktop(page);

    const chromeWindow = await openWindow(page, 'chrome');
    const terminalWindow = await openWindow(page, 'terminal');
    const spotifyWindow = await openWindow(page, 'spotify');

    await openWindow(page, 'terminal');
    await expect.poll(async () => getZIndex(terminalWindow)).toBe('30');
    await expect.poll(async () => getZIndex(chromeWindow)).not.toBe('30');

    await openWindow(page, 'spotify');
    await expect.poll(async () => getZIndex(spotifyWindow)).toBe('30');

    await openWindow(page, 'chrome');
    await expect.poll(async () => getZIndex(chromeWindow)).toBe('30');

    await sendKey(chromeWindow, 'ArrowLeft', { alt: true });
    await expect.poll(async () => {
      const { width, height } = await getWindowStyle(chromeWindow);
      return [width, height];
    }).toEqual([50, 96.3]);

    await sendKey(chromeWindow, 'ArrowDown', { alt: true });
    await expect.poll(async () => {
      const { width } = await getWindowStyle(chromeWindow);
      return width;
    }).not.toBe(50);

    const beforeResize = await getWindowStyle(chromeWindow);
    await sendKey(chromeWindow, 'ArrowRight', { shift: true });
    await sendKey(chromeWindow, 'ArrowDown', { shift: true });
    await expect.poll(async () => {
      const { width } = await getWindowStyle(chromeWindow);
      return width;
    }).toBeGreaterThan(beforeResize.width);
    await expect.poll(async () => {
      const { height } = await getWindowStyle(chromeWindow);
      return height;
    }).toBeGreaterThan(beforeResize.height);

    const chromeTaskbar = desktopSelectors.taskbarButton(page, 'chrome');
    await triggerClick(page, `[data-context="taskbar"][data-app-id="chrome"]`);
    await expect(chromeWindow).toBeHidden();

    await triggerClick(page, `[data-context="taskbar"][data-app-id="chrome"]`);
    await expect(chromeWindow).toBeVisible();

    await triggerClick(page, '#close-chrome');
    await expect(chromeWindow).toHaveCount(0);
  });
});
