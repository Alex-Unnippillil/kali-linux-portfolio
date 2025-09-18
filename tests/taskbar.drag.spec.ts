import { test, expect } from '@playwright/test';
import type { Page, JSHandle } from '@playwright/test';

async function prepareDesktop(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('#app-chrome');
  await page.locator('#app-chrome').dblclick({ delay: 100 });
  await page.locator('#chrome').waitFor({ state: 'visible' });
  await page.locator('button[data-app-id="chrome"]').waitFor();

  await page.locator('#app-gedit').dblclick({ delay: 100 });
  await page.locator('#gedit').waitFor({ state: 'visible' });
  await page.locator('button[data-app-id="gedit"]').waitFor();

  await page.waitForTimeout(100);
}

async function getFocusedWindowId(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const node = document.querySelector('.opened-window.z-30');
    return node ? node.id : null;
  });
}

async function isWindowFocused(page: Page, id: string): Promise<boolean> {
  const className = await page.locator(`#${id}`).getAttribute('class');
  return typeof className === 'string' && className.includes('z-30');
}

async function createDataTransfer(page: Page): Promise<JSHandle<DataTransfer>> {
  return await page.evaluateHandle(() => new DataTransfer());
}

async function startDesktopDrag(page: Page, iconId: string): Promise<JSHandle<DataTransfer>> {
  const dataTransfer = await createDataTransfer(page);
  await page.dispatchEvent(`#app-${iconId}`, 'dragstart', {
    bubbles: true,
    cancelable: true,
    dataTransfer,
  });
  return dataTransfer;
}

async function hoverTaskbarButton(page: Page, appId: string, dataTransfer: JSHandle<DataTransfer>): Promise<void> {
  const selector = `button[data-app-id="${appId}"]`;
  await page.dispatchEvent(selector, 'dragenter', {
    bubbles: true,
    cancelable: true,
    dataTransfer,
  });
  await page.dispatchEvent(selector, 'dragover', {
    bubbles: true,
    cancelable: true,
    dataTransfer,
  });
}

async function leaveTaskbarButton(page: Page, appId: string, dataTransfer: JSHandle<DataTransfer>): Promise<void> {
  const selector = `button[data-app-id="${appId}"]`;
  await page.dispatchEvent(selector, 'dragleave', {
    bubbles: true,
    cancelable: true,
    dataTransfer,
  });
}

async function endDesktopDrag(page: Page, iconId: string, dataTransfer: JSHandle<DataTransfer>): Promise<void> {
  await page.dispatchEvent(`#app-${iconId}`, 'dragend', {
    bubbles: true,
    cancelable: true,
    dataTransfer,
  });
  await dataTransfer.dispose();
}

test.describe('taskbar drag hover focus', () => {
  test('focuses taskbar window after hover delay and restores origin on cancel', async ({ page }) => {
    await prepareDesktop(page);
    await page.waitForSelector('#app-trash');

    const initialFocus = await getFocusedWindowId(page);
    expect(initialFocus).not.toBeNull();

    const dataTransfer = await startDesktopDrag(page, 'trash');
    const targetButton = page.locator('button[data-app-id="chrome"]');

    await expect(targetButton).not.toHaveAttribute('aria-description', /./);

    try {
      await hoverTaskbarButton(page, 'chrome', dataTransfer);

      expect(await isWindowFocused(page, 'chrome')).toBe(false);

      await page.waitForTimeout(500);

      await expect(targetButton).toHaveAttribute('aria-description', 'Google Chrome window raised for drop');
      await expect(page.locator('#live-region')).toHaveText('Google Chrome window raised for drop');
      expect(await isWindowFocused(page, 'chrome')).toBe(true);

      await leaveTaskbarButton(page, 'chrome', dataTransfer);
      await page.waitForTimeout(100);

      await expect(targetButton).not.toHaveAttribute('aria-description', /./);
      expect(await getFocusedWindowId(page)).toBe(initialFocus);
    } finally {
      await endDesktopDrag(page, 'trash', dataTransfer);
    }
  });

  test('uses extended delay when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepareDesktop(page);
    await page.waitForSelector('#app-trash');

    const dataTransfer = await startDesktopDrag(page, 'trash');

    try {
      await hoverTaskbarButton(page, 'chrome', dataTransfer);

      await page.waitForTimeout(360);
      expect(await isWindowFocused(page, 'chrome')).toBe(false);

      await page.waitForTimeout(220);
      expect(await isWindowFocused(page, 'chrome')).toBe(true);

      await leaveTaskbarButton(page, 'chrome', dataTransfer);
    } finally {
      await endDesktopDrag(page, 'trash', dataTransfer);
    }
  });
});

