import { expect, test, type Locator, type Page } from '@playwright/test';

async function exerciseMenu(
  page: Page,
  menu: Locator,
  options: {
    open: () => Promise<void>;
    trigger?: Locator;
    expectedFocusReturn?: 'trigger' | 'body';
  },
) {
  await options.open();
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS('z-index', '50');
  await expect(page.locator('[role="menu"]:visible')).toHaveCount(1);

  const items = menu.locator('[role="menuitem"]');
  await expect(items.first()).toBeVisible();

  const focusInside = await menu.evaluate((el) => el.contains(document.activeElement));
  if (!focusInside) {
    await page.keyboard.press('Tab');
  }
  await expect(items.first()).toBeFocused();

  const itemCount = await items.count();
  if (itemCount > 1) {
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
  } else {
    await page.keyboard.press('ArrowDown');
  }
  await expect(items.first()).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  if (itemCount > 1) {
    await expect(items.nth(itemCount - 1)).toBeFocused();
    await page.keyboard.press('Tab');
  }
  await expect(items.first()).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.locator('[role="menu"]:visible')).toHaveCount(0);
  await expect(page.locator('.opened-window[inert]')).toHaveCount(0);

  if (options.expectedFocusReturn === 'trigger' && options.trigger) {
    await expect(options.trigger).toBeFocused();
  } else if (options.expectedFocusReturn === 'body') {
    await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBeTruthy();
  }
}

test.describe('Menu regressions', () => {
  test('context menus stay accessible and do not leak focus', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#desktop-menu');

    const desktopMenu = page.locator('#desktop-menu');
    const appMenu = page.locator('#app-menu');
    const taskbarMenu = page.locator('#taskbar-menu');

    const desktopIcon = page.locator('[id^="app-"]').first();
    await expect(desktopIcon).toBeVisible();

    const taskbarButton = page.locator('[data-context="taskbar"]').first();
    await expect(taskbarButton).toBeVisible();

    let openCount = 0;

    for (let i = 0; i < 20; i += 1) {
      await exerciseMenu(page, desktopMenu, {
        open: async () => {
          await page.evaluate(() => {
            const area = document.querySelector<HTMLElement>('#window-area');
            if (!area) {
              throw new Error('Desktop area missing');
            }
            const event = new KeyboardEvent('keydown', {
              key: 'F10',
              shiftKey: true,
              bubbles: true,
            });
            area.dispatchEvent(event);
          });
        },
        expectedFocusReturn: 'body',
      });
      openCount += 1;
    }

    for (let i = 0; i < 15; i += 1) {
      await exerciseMenu(page, appMenu, {
        open: async () => {
          await desktopIcon.focus();
          await desktopIcon.press('Shift+F10');
        },
        trigger: desktopIcon,
        expectedFocusReturn: 'trigger',
      });
      openCount += 1;
    }

    for (let i = 0; i < 15; i += 1) {
      await exerciseMenu(page, taskbarMenu, {
        open: async () => {
          await taskbarButton.focus();
          await taskbarButton.press('Shift+F10');
        },
        trigger: taskbarButton,
        expectedFocusReturn: 'trigger',
      });
      openCount += 1;
    }

    expect(openCount).toBe(50);

    const dockIcon = page.locator('[id^="sidebar-"]').first();
    if (await dockIcon.count()) {
      const label = (await dockIcon.getAttribute('aria-label'))?.trim() || (await dockIcon.textContent())?.trim();
      if (label) {
        const tooltip = dockIcon.locator(`div:has-text("${label}")`).first();
        if (await tooltip.count()) {
          await page.mouse.move(0, 0);
          await expect(tooltip).toHaveClass(/invisible/);

          await dockIcon.hover();
          await expect(tooltip).toHaveClass(/visible/);

          await page.mouse.move(0, 0);
          await expect.poll(() => tooltip.evaluate((node) => node.classList.contains('invisible'))).toBeTruthy();

          await dockIcon.focus();
          await expect(tooltip).toHaveClass(/invisible/);

          await desktopIcon.focus();
          await expect(tooltip).toHaveClass(/invisible/);
        }
      }
    }

    const statusTooltip = page.locator('#status-bar [title]');
    if (await statusTooltip.count()) {
      const titleValue = (await statusTooltip.first().getAttribute('title')) || '';
      await page.locator('#status-bar').focus();
      await expect(statusTooltip.first()).toHaveAttribute('title', titleValue);
      await desktopIcon.focus();
      await expect(statusTooltip.first()).toHaveAttribute('title', titleValue);
    }
  });
});
