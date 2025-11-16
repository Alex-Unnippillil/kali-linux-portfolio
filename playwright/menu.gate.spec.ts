import { expect, Locator, Page, test } from '@playwright/test';

const MENU_SELECTORS = ['#desktop-menu', '#default-menu', '#app-menu', '#taskbar-menu'] as const;

type MenuId = (typeof MENU_SELECTORS)[number];

async function waitForDesktopReady(page: Page) {
  await page.waitForSelector('#window-area');
  await page.waitForFunction(() => {
    const bootLogo = document.querySelector('img[alt="Ubuntu Logo"]');
    if (!bootLogo) return true;
    const container = bootLogo.closest('div');
    if (!container) return true;
    const style = window.getComputedStyle(container as HTMLElement);
    return style.visibility === 'hidden' || style.opacity === '0';
  }, undefined, { timeout: 15000 });
}

async function focusElement(target: Locator) {
  try {
    await target.focus();
    return;
  } catch (error) {
    // Fall through to script-based focus.
  }
  await target.evaluate((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (!node.hasAttribute('tabindex')) {
      node.setAttribute('tabindex', '-1');
    }
    node.focus();
  });
}

async function assertMenuVisibility(page: Page, active?: MenuId) {
  for (const id of MENU_SELECTORS) {
    const locator = page.locator(id);
    if (active && id === active) {
      await expect(locator, `${id} should be visible`).toBeVisible();
    } else {
      await expect(locator, `${id} should be hidden`).toBeHidden();
    }
  }
}

async function isFocusInsideMenu(page: Page, selector: MenuId) {
  return page.evaluate((sel) => {
    const menu = document.querySelector(sel);
    if (!menu) return false;
    return menu.contains(document.activeElement);
  }, selector);
}

async function assertNoInertElements(page: Page) {
  const inertCount = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[inert]')).length;
  });
  expect(inertCount, 'No inert overlays should remain after closing context menus').toBe(0);
}

async function openMenuOnce(page: Page, target: Locator, menuId: MenuId) {
  await target.scrollIntoViewIfNeeded();
  await focusElement(target);
  try {
    await target.press('Shift+F10');
  } catch (error) {
    await page.keyboard.press('Shift+F10');
  }

  await assertMenuVisibility(page, menuId);
  expect(await isFocusInsideMenu(page, menuId)).toBeTruthy();

  // Arrow key navigation should remain within the menu (roving tab index).
  await page.keyboard.press('ArrowDown');
  expect(await isFocusInsideMenu(page, menuId)).toBeTruthy();

  await page.keyboard.press('Escape');
  await assertMenuVisibility(page);
  expect(await isFocusInsideMenu(page, menuId)).toBeFalsy();
  await assertNoInertElements(page);
}

async function drillMenus(
  page: Page,
  collection: Locator,
  menuId: MenuId,
  total: number,
  filterDisabled = false,
) {
  const count = await collection.count();
  const usableIndices: number[] = [];
  for (let i = 0; i < count; i++) {
    if (!filterDisabled) {
      usableIndices.push(i);
      continue;
    }
    const candidate = collection.nth(i);
    const disabled = (await candidate.getAttribute('aria-disabled')) === 'true';
    if (!disabled) {
      usableIndices.push(i);
    }
  }
  expect(
    usableIndices.length,
    `Expected at least one focusable trigger for menu ${menuId}`,
  ).toBeGreaterThan(0);

  for (let i = 0; i < total; i++) {
    const index = usableIndices[i % usableIndices.length];
    const target = collection.nth(index);
    await openMenuOnce(page, target, menuId);
  }

  return total;
}

async function openDesktopMenuAndLaunchSettings(page: Page, desktopArea: Locator) {
  await focusElement(desktopArea);
  try {
    await desktopArea.press('Shift+F10');
  } catch (error) {
    await page.keyboard.press('Shift+F10');
  }
  await assertMenuVisibility(page, '#desktop-menu');
  expect(await isFocusInsideMenu(page, '#desktop-menu')).toBeTruthy();

  // Navigate to the "Settings" option within the desktop context menu.
  const stepsToSettings = 7;
  for (let i = 0; i < stepsToSettings; i++) {
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Enter');

  await assertMenuVisibility(page);
  await page.locator('#settings').waitFor({ state: 'visible' });
}

test('context menus stay focus-safe across desktop, icons, and taskbar', async ({ page }) => {
  await page.goto('/');
  await waitForDesktopReady(page);
  await assertMenuVisibility(page);

  const desktopArea = page.locator('#window-area');
  const desktopMenuId: MenuId = '#desktop-menu';
  const appMenuId: MenuId = '#app-menu';
  const taskbarMenuId: MenuId = '#taskbar-menu';

  await openDesktopMenuAndLaunchSettings(page, desktopArea);
  let menuInteractions = 1; // launching settings opens the menu once.

  menuInteractions += await drillMenus(page, desktopArea, desktopMenuId, 9);

  const desktopIcons = page.locator('[data-context="app"][data-app-id]');
  menuInteractions += await drillMenus(page, desktopIcons, appMenuId, 20, true);

  const taskbarButtons = page.locator('button[data-context="taskbar"]');
  await expect(taskbarButtons.first(), 'Taskbar should expose running apps').toBeVisible();
  menuInteractions += await drillMenus(page, taskbarButtons, taskbarMenuId, 20);

  expect(menuInteractions, 'Total menu interactions should reach 50').toBe(50);

  const statusButton = page.getByRole('button', { name: 'System status' });
  const statusTooltip = statusButton.locator('[title]');
  await statusButton.focus();
  await expect(statusButton).toBeFocused();
  await expect(statusTooltip).toHaveAttribute('title', /Online/);

  const allowNetworkCheckbox = page.getByRole('checkbox', { name: 'Allow Network Requests' });
  await allowNetworkCheckbox.focus();
  await expect(allowNetworkCheckbox).toBeFocused();
  await expect(allowNetworkCheckbox).toBeChecked();

  await page.keyboard.press(' ');
  await expect(allowNetworkCheckbox).not.toBeChecked();
  await statusButton.focus();
  await expect(statusTooltip).toHaveAttribute('title', 'Online (requests blocked)');

  await allowNetworkCheckbox.focus();
  await page.keyboard.press(' ');
  await expect(allowNetworkCheckbox).toBeChecked();
  await statusButton.focus();
  await expect(statusTooltip).toHaveAttribute('title', 'Online');
});
