import { expect, test, Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 430, height: 900 } as const;
const KEYBOARD_VIEWPORT = { width: 430, height: 540 } as const;

async function openDesktopWindow(page: Page, appId: string) {
  const icon = page.locator(`[data-app-id="${appId}"]`);
  await icon.waitFor({ state: 'visible' });
  await icon.click();
  await icon.press('Enter');
  await page.locator(`#${appId}`).waitFor({ state: 'visible' });
}

async function readWindowTranslateY(page: Page, windowId: string): Promise<number | null> {
  return page.evaluate((id) => {
    const node = document.getElementById(id);
    if (!node) return null;
    const style = node.style as CSSStyleDeclaration | undefined;
    const raw = style?.getPropertyValue?.('--window-transform-y') ?? null;
    if (raw) {
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    const rect = node.getBoundingClientRect();
    return Number.isFinite(rect.top) ? rect.top : null;
  }, windowId);
}

test.describe('Mobile keyboard avoidance', () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    isMobile: true,
    hasTouch: true,
  });

  test('keeps gedit form fields visible when virtual keyboard is shown', async ({ page }) => {
    await page.goto('/');
    await openDesktopWindow(page, 'gedit');
    await page.waitForFunction(() => {
      const node = document.getElementById('gedit');
      if (!node) return false;
      const raw = node.style?.getPropertyValue?.('--window-transform-y');
      if (raw && Number.isFinite(parseFloat(raw))) {
        return true;
      }
      return !!node.getBoundingClientRect();
    });
    const baselineY = await readWindowTranslateY(page, 'gedit');
    if (baselineY == null) {
      throw new Error('Failed to read initial gedit position');
    }

    const messageField = page.locator('#sender-message');
    await messageField.waitFor({ state: 'visible' });
    await messageField.click();

    await page.setViewportSize(KEYBOARD_VIEWPORT);

    await expect
      .poll(async () => {
        const delta = await page.evaluate(() => {
          const field = document.getElementById('sender-message');
          if (!field) return Number.POSITIVE_INFINITY;
          const rect = field.getBoundingClientRect();
          const viewport = window.visualViewport;
          const bottomLimit = viewport
            ? viewport.height + viewport.offsetTop - 8
            : window.innerHeight - 8;
          return rect.bottom - bottomLimit;
        });
        return delta;
      }, { timeout: 5000 })
      .toBeLessThanOrEqual(0);

    await page.setViewportSize(MOBILE_VIEWPORT);

    await expect
      .poll(async () => {
        const current = await readWindowTranslateY(page, 'gedit');
        return current ?? Number.NaN;
      }, { timeout: 5000 })
      .toBeCloseTo(baselineY, 1);
  });

  test('restores terminal window position after keyboard dismissal', async ({ page }) => {
    await page.goto('/');
    await openDesktopWindow(page, 'terminal');
    await page.waitForFunction(() => {
      const node = document.getElementById('terminal');
      if (!node) return false;
      const raw = node.style?.getPropertyValue?.('--window-transform-y');
      if (raw && Number.isFinite(parseFloat(raw))) {
        return true;
      }
      return !!node.getBoundingClientRect();
    });
    const baselineY = await readWindowTranslateY(page, 'terminal');
    if (baselineY == null) {
      throw new Error('Failed to read initial terminal position');
    }

    const terminalSurface = page.locator('#terminal');
    await terminalSurface.click();

    await page.setViewportSize(KEYBOARD_VIEWPORT);

    await expect
      .poll(async () => {
        const current = await readWindowTranslateY(page, 'terminal');
        if (current == null) return Number.NaN;
        return baselineY - current;
      }, { timeout: 5000 })
      .toBeGreaterThan(4);

    await page.setViewportSize(MOBILE_VIEWPORT);

    await expect
      .poll(async () => {
        const current = await readWindowTranslateY(page, 'terminal');
        return current ?? Number.NaN;
      }, { timeout: 5000 })
      .toBeCloseTo(baselineY, 1);
  });
});
