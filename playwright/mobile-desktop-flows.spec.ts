import { expect, test, type Locator, type Page } from '@playwright/test';

test.describe('mobile desktop shell flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage?.setItem('booting_screen', 'false');
        window.localStorage?.setItem('screen-locked', 'false');
        window.localStorage?.removeItem('shut-down');
      } catch {}
    });
  });

  const openLauncher = async (page: Page) => {
    await page.goto('/');
    const launcherButton = page.getByRole('button', { name: 'Applications' });
    await expect(launcherButton).toBeVisible();
    await launcherButton.click();
    const dropdown = page.getByTestId('whisker-menu-dropdown');
    await expect(dropdown).toBeVisible();
    return dropdown;
  };

  const openTerminalWindow = async (page: Page) => {
    const dropdown = await openLauncher(page);
    const searchBox = dropdown.getByLabelText('Search applications');
    await searchBox.fill('terminal');
    const terminalButton = dropdown.getByRole('button', { name: 'Terminal' });
    await terminalButton.click();
    const windowLocator = page.getByRole('dialog', { name: 'Terminal' });
    await expect(windowLocator).toBeVisible();
    await expect(windowLocator).toHaveAttribute('data-window-state', 'active');
    return windowLocator;
  };

  const dispatchKey = async (locator: Locator, eventInit: KeyboardEventInit) => {
    await locator.evaluate((node, init) => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
      node.dispatchEvent(event);
    }, eventInit);
  };

  const dispatchSuperArrow = async (locator: Locator, detail: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => {
    await locator.evaluate((node, direction) => {
      const event = new CustomEvent('super-arrow', { detail: direction });
      node.dispatchEvent(event);
    }, detail);
  };

  test('launcher search surfaces applications', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'Executed only on mobile viewport projects.');
    const dropdown = await openLauncher(page);
    const searchBox = dropdown.getByLabelText('Search applications');
    await searchBox.fill('calc');
    const calculatorEntry = dropdown.getByRole('button', { name: 'Calculator' });
    await expect(calculatorEntry).toBeVisible();
  });

  test('terminal opens from launcher', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'Executed only on mobile viewport projects.');
    const terminalWindow = await openTerminalWindow(page);
    await expect(terminalWindow).toBeVisible();
  });

  test('window resizing via keyboard shortcuts', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'Executed only on mobile viewport projects.');
    const terminalWindow = await openTerminalWindow(page);
    const widthBefore = await terminalWindow.evaluate((node) => node.getBoundingClientRect().width);
    await dispatchKey(terminalWindow, { key: 'ArrowRight', shiftKey: true });
    await expect.poll(async () =>
      terminalWindow.evaluate((node) => node.getBoundingClientRect().width),
    ).toBeGreaterThan(widthBefore);
  });

  test('window snapping toggles state', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'Executed only on mobile viewport projects.');
    const terminalWindow = await openTerminalWindow(page);
    await dispatchSuperArrow(terminalWindow, 'ArrowLeft');
    await expect(terminalWindow).toHaveAttribute('data-window-state', 'snapped-left');
    await dispatchSuperArrow(terminalWindow, 'ArrowDown');
    await expect(terminalWindow).toHaveAttribute('data-window-state', 'active');
  });

  test('apps catalog supports browser back navigation', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'Executed only on mobile viewport projects.');
    await page.goto('/apps');
    await page.getByRole('link', { name: 'Calculator' }).click();
    await expect(page).toHaveURL(/\/apps\/calculator$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/apps$/);
    await expect(page.locator('#app-grid')).toBeVisible();
  });

  test('offline fallback lists cached applications message', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'Executed only on mobile viewport projects.');
    await page.goto('/offline.html');
    await expect(page.getByRole('heading', { name: 'Offline' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    const cachedList = page.locator('#apps li');
    await expect(cachedList.first()).toContainText(/No apps available offline|Unable to access cached apps/);
  });
});
