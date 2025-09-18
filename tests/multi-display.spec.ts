import { test, expect } from '@playwright/test';

type DisplayConfig = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};

const getWindowRect = async (selector: string, page: import('@playwright/test').Page) => {
  return page.locator(selector).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
  });
};

const dragWindow = async (
  page: import('@playwright/test').Page,
  selector: string,
  targetX: number,
  targetY: number,
) => {
  const handle = page.locator(`${selector} .bg-ub-window-title`);
  await handle.waitFor({ state: 'visible' });
  const box = await handle.boundingBox();
  if (!box) throw new Error('Window title bar not found');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.mouse.up();
};

const waitForWindowWithinDisplay = async (
  page: import('@playwright/test').Page,
  selector: string,
  display: DisplayConfig,
) => {
  await expect
    .poll(async () => {
      const rect = await getWindowRect(selector, page);
      return rect.left;
    })
    .toBeGreaterThanOrEqual(display.x - 2);
  await expect
    .poll(async () => {
      const rect = await getWindowRect(selector, page);
      return rect.left + rect.width;
    })
    .toBeLessThanOrEqual(display.x + display.width + 2);
  await expect
    .poll(async () => {
      const rect = await getWindowRect(selector, page);
      return rect.top;
    })
    .toBeGreaterThanOrEqual(display.y - 2);
  await expect
    .poll(async () => {
      const rect = await getWindowRect(selector, page);
      return rect.top + rect.height;
    })
    .toBeLessThanOrEqual(display.y + display.height + 2);
};

const clearAndStubDisplays = async (page: import('@playwright/test').Page, layout: DisplayConfig[]) => {
  await page.addInitScript((config: DisplayConfig[]) => {
    window.localStorage.clear();
    window.__KALI_DISPLAY_OVERRIDE__ = config;
  }, layout);
};

test.describe('multi-display window dragging', () => {
  test('rescales window when moving to a higher density display', async ({ page }) => {
    const displays: DisplayConfig[] = [
      { id: 'primary', x: 0, y: 0, width: 1280, height: 800, scale: 1 },
      { id: 'secondary', x: 1280, y: 0, width: 1600, height: 900, scale: 1.5 },
    ];
    await clearAndStubDisplays(page, displays);
    await page.goto('/');
    const aboutSelector = '#about-alex';
    await page.locator(aboutSelector).waitFor({ state: 'visible' });
    const initialRect = await getWindowRect(aboutSelector, page);

    const targetX = displays[1].x + displays[1].width / 2;
    const targetY = displays[1].y + 150;
    await dragWindow(page, aboutSelector, targetX, targetY);
    await waitForWindowWithinDisplay(page, aboutSelector, displays[1]);

    const finalRect = await getWindowRect(aboutSelector, page);
    const rawExpectedWidth = initialRect.width * (displays[0].scale / displays[1].scale);
    const minWidth = displays[1].width * 0.2;
    const maxWidth = displays[1].width;
    const expectedWidth = Math.min(Math.max(rawExpectedWidth, minWidth), maxWidth);
    expect(Math.abs(finalRect.width - expectedWidth)).toBeLessThan(6);

    const session = await page.evaluate(() => {
      const raw = window.localStorage.getItem('desktop-session');
      return raw ? JSON.parse(raw) : null;
    });
    expect(session).not.toBeNull();
    const aboutSession = session.windows.find((w: any) => w.id === 'about-alex');
    expect(aboutSession?.displayId).toBe('secondary');
  });

  test('expands window when moving to a lower density display', async ({ page }) => {
    const displays: DisplayConfig[] = [
      { id: 'hidpi', x: 0, y: 0, width: 1600, height: 900, scale: 1.5 },
      { id: 'standard', x: 1600, y: 0, width: 1280, height: 800, scale: 1 },
    ];
    await clearAndStubDisplays(page, displays);
    await page.goto('/');
    const aboutSelector = '#about-alex';
    await page.locator(aboutSelector).waitFor({ state: 'visible' });
    const initialRect = await getWindowRect(aboutSelector, page);

    const targetX = displays[1].x + displays[1].width / 2;
    const targetY = displays[1].y + 160;
    await dragWindow(page, aboutSelector, targetX, targetY);
    await waitForWindowWithinDisplay(page, aboutSelector, displays[1]);

    const finalRect = await getWindowRect(aboutSelector, page);
    const rawExpectedWidth = initialRect.width * (displays[0].scale / displays[1].scale);
    const minWidth = displays[1].width * 0.2;
    const maxWidth = displays[1].width;
    const expectedWidth = Math.min(Math.max(rawExpectedWidth, minWidth), maxWidth);
    expect(Math.abs(finalRect.width - expectedWidth)).toBeLessThan(6);
    expect(finalRect.width).toBeLessThanOrEqual(displays[1].width + 2);

    const session = await page.evaluate(() => {
      const raw = window.localStorage.getItem('desktop-session');
      return raw ? JSON.parse(raw) : null;
    });
    expect(session).not.toBeNull();
    const aboutSession = session.windows.find((w: any) => w.id === 'about-alex');
    expect(aboutSession?.displayId).toBe('standard');
  });
});
