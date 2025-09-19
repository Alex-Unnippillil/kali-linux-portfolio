import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  DESKTOP_SHORTCUT_TARGET,
  createDesktopStorageSeed,
  getAlternateWallpaper,
} from './fixtures/desktopState';

async function readKeyval(page: Page, key: string): Promise<string | undefined> {
  return page.evaluate((k) => {
    return new Promise<string | undefined>((resolve, reject) => {
      const request = indexedDB.open('keyval-store');
      request.onerror = () => reject(request.error ?? new Error('Failed to open indexedDB'));
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('keyval', 'readonly');
        const store = tx.objectStore('keyval');
        const getRequest = store.get(k);
        getRequest.onerror = () => reject(getRequest.error ?? new Error('Failed to read keyval entry'));
        getRequest.onsuccess = () => resolve(getRequest.result as string | undefined);
      };
    });
  }, key);
}

test.describe.configure({ mode: 'serial' });

test('desktop shell regression gate', async ({ page }) => {
  const { storage, shortcuts, wallpaper } = createDesktopStorageSeed(DESKTOP_SHORTCUT_TARGET);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.addInitScript(({ seed }) => {
    for (const [key, value] of Object.entries(seed)) {
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(key, value);
      }
    }
  }, { seed: storage });

  await page.goto('/');
  const desktop = page.locator('#desktop');
  await expect(desktop).toBeVisible();

  const icons = desktop.locator('[role="button"][id^="app-"]');
  await expect(icons).toHaveCount(shortcuts.length);

  const desktopBox = await desktop.boundingBox();
  if (!desktopBox) {
    throw new Error('Desktop bounding box was not available');
  }

  const startX = desktopBox.x + Math.min(desktopBox.width * 0.1, 48);
  const startY = desktopBox.y + Math.min(desktopBox.height * 0.1, 48);
  const maxX = desktopBox.x + desktopBox.width - 32;
  const maxY = desktopBox.y + desktopBox.height - 32;
  const endX = Math.min(maxX, Math.max(startX + 120, desktopBox.x + desktopBox.width * 0.6));
  const endY = Math.min(maxY, Math.max(startY + 120, desktopBox.y + desktopBox.height * 0.5));

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.mouse.up();

  await desktop.click({
    button: 'right',
    position: {
      x: Math.round(desktopBox.width / 2),
      y: Math.round(desktopBox.height / 2),
    },
  });

  const desktopMenu = page.locator('#desktop-menu');
  await expect(desktopMenu).toBeVisible();

  await page.getByRole('menuitem', { name: /^Change Background/ }).click();
  const settingsWindow = page.getByRole('dialog', { name: 'Settings' });
  await expect(settingsWindow).toBeVisible();

  const backgroundImage = page.locator('div.bg-ubuntu-img img');
  await expect(backgroundImage).toBeVisible();

  const initialSrc = await backgroundImage.getAttribute('src');
  const targetWallpaper = getAlternateWallpaper(initialSrc ?? wallpaper);
  const wallpaperNumber = targetWallpaper.replace('wall-', '');

  await page.getByRole('button', { name: new RegExp(`Select wallpaper ${wallpaperNumber}$`) }).click();
  await expect(backgroundImage).toHaveAttribute('src', `/wallpapers/${targetWallpaper}.webp`);
  await expect.poll(async () => readKeyval(page, 'bg-image')).toBe(targetWallpaper);

  await page.reload();
  await expect(desktop).toBeVisible();
  await expect(icons).toHaveCount(shortcuts.length);
  const backgroundImageAfterReload = page.locator('div.bg-ubuntu-img img');
  await expect(backgroundImageAfterReload).toHaveAttribute('src', `/wallpapers/${targetWallpaper}.webp`);

  const noisyPatterns = [
    /\/\_vercel\//i,
    /Failed to load resource: the server responded with a status of 404/i,
    /ServiceWorker/i,
    /<DraggableCore> not mounted on DragStart!/,
  ];
  const filterNoise = (messages: string[]) =>
    messages.filter((message) => !noisyPatterns.some((pattern) => pattern.test(message)));
  const remainingConsoleErrors = filterNoise(consoleErrors);
  const remainingPageErrors = filterNoise(pageErrors);

  expect([...remainingConsoleErrors, ...remainingPageErrors]).toEqual([]);
});
