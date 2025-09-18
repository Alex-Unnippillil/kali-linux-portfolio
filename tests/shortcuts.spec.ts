import { expect, test } from '@playwright/test';

test.describe('desktop global shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#desktop').waitFor();
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'terminal' }));
    });
    await page.locator('#terminal').waitFor();
  });

  test('Alt+Tab opens the window switcher', async ({ page }) => {
    const switcher = page.locator('[data-testid="window-switcher"]');
    await page.keyboard.down('Alt');
    await page.keyboard.press('Tab');
    await expect(switcher).toBeVisible();
    await page.keyboard.up('Alt');
    await expect(switcher).toBeHidden();
  });

  test('Ctrl+Backquote cycles window focus', async ({ page }) => {
    const before = await page.evaluate(() => document.activeElement?.id || null);
    await page.keyboard.press('Control+Backquote');
    await page.waitForFunction(
      (previous) => {
        const active = document.activeElement as HTMLElement | null;
        return !!active && active.id && active.id !== previous;
      },
      before,
    );
    const after = await page.evaluate(() => document.activeElement?.id || null);
    expect(after).not.toBe(before);
  });

  test('Win key toggles the application overview', async ({ page }) => {
    const overview = page.locator('[data-testid="all-applications"]');
    await page.keyboard.press('Meta');
    await expect(overview).toBeVisible();
    await page.keyboard.press('Meta');
    await expect(overview).toBeHidden();
  });

  test('Shortcuts pause in inputs and can be cancelled', async ({ page }) => {
    await page.keyboard.press('Meta');
    const search = page.locator('[data-testid="all-applications"] input');
    await search.focus();
    await page.keyboard.press('Control+Backquote');
    await expect(search).toBeFocused();
    await page.keyboard.press('Meta');

    await page.evaluate(() => {
      window.addEventListener(
        'global-shortcuts:before-handle',
        (event: Event) => {
          const detail = (event as CustomEvent).detail;
          if (detail?.type === 'ctrlBacktick') {
            event.preventDefault();
          }
        },
        { once: true },
      );
    });

    const initial = await page.evaluate(() => document.activeElement?.id || null);
    await page.keyboard.press('Control+Backquote');
    await page.waitForTimeout(50);
    const final = await page.evaluate(() => document.activeElement?.id || null);
    expect(final).toBe(initial);
  });
});
