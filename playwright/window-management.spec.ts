import { expect, Locator, Page, test } from '@playwright/test';

type ViewportConfig = {
  name: string;
  width: number;
  height: number;
};

const viewports: ViewportConfig[] = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

const APP_WINDOWS: Record<string, { id: string; label: string }> = {
  terminal: { id: 'terminal', label: 'Terminal' },
  vscode: { id: 'vscode', label: 'Visual Studio Code' },
  calculator: { id: 'calculator', label: 'Calculator' },
};

async function prepareDesktop(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('booting_screen', 'false');
      window.localStorage.setItem('screen-locked', 'false');
    } catch (error) {
      // ignore storage failures in test environments without localStorage
    }
  });
  await page.goto('/');
  await page.waitForSelector('#desktop', { state: 'visible' });
  await page.waitForSelector('#window-area');
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition-duration: 0ms !important;
        animation-duration: 0ms !important;
        animation-delay: 0ms !important;
      }
    `,
  });
}

async function openAppWindow(page: Page, app: { id: string; label: string }) {
  const icon = page.getByRole('button', { name: app.label });
  await icon.waitFor({ state: 'visible' });
  await icon.dblclick();
  const windowLocator = page.locator(`#${app.id}`);
  await expect(windowLocator).toBeVisible({ timeout: 15_000 });
  await expect(windowLocator).toHaveAttribute('data-window-state', /active|snapped-[a-z-]+|maximized/);
  return windowLocator;
}

async function dragWindowTo(page: Page, windowLocator: Locator, target: { x: number; y: number }) {
  const titleBar = windowLocator.locator('.bg-ub-window-title').first();
  await expect(titleBar).toBeVisible();
  const box = await titleBar.boundingBox();
  if (!box) {
    throw new Error('Failed to measure window title bar');
  }
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 20 });
  await page.waitForTimeout(120);
  await page.mouse.up();
}

function assertWithinRange(actual: number, expected: number, tolerance: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

for (const viewport of viewports) {
  test.describe(`Desktop windowing at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test(`snaps windows into grid and validates layout`, async ({ page }) => {
      await prepareDesktop(page);
      const terminal = await openAppWindow(page, APP_WINDOWS.terminal);
      const vscode = await openAppWindow(page, APP_WINDOWS.vscode);
      const calculator = await openAppWindow(page, APP_WINDOWS.calculator);

      const viewportSize = page.viewportSize();
      if (!viewportSize) {
        throw new Error('Viewport unavailable');
      }

      const leftSnapTarget = { x: 32, y: Math.round(viewportSize.height * 0.55) };
      await dragWindowTo(page, terminal, leftSnapTarget);
      await expect(terminal).toHaveAttribute('data-window-state', 'snapped-left');

      const topRightTarget = { x: viewportSize.width - 32, y: Math.max(140, Math.round(viewportSize.height * 0.25)) };
      await dragWindowTo(page, vscode, topRightTarget);
      await expect(vscode).toHaveAttribute('data-window-state', 'snapped-top-right');

      const bottomRightTarget = { x: viewportSize.width - 28, y: viewportSize.height - 40 };
      await dragWindowTo(page, calculator, bottomRightTarget);
      await expect(calculator).toHaveAttribute('data-window-state', 'snapped-bottom-right');

      await page.waitForTimeout(200);

      const terminalBox = await terminal.boundingBox();
      const vscodeBox = await vscode.boundingBox();
      const calculatorBox = await calculator.boundingBox();

      if (!terminalBox || !vscodeBox || !calculatorBox) {
        throw new Error('Unable to measure snapped window geometry');
      }

      assertWithinRange(terminalBox.width, viewportSize.width / 2, 40);
      assertWithinRange(vscodeBox.width, viewportSize.width / 2, 40);
      assertWithinRange(calculatorBox.width, viewportSize.width / 2, 40);

      assertWithinRange(vscodeBox.height * 2, terminalBox.height, 48);
      assertWithinRange(calculatorBox.height, vscodeBox.height, 32);

      assertWithinRange(terminalBox.y, vscodeBox.y, 24);
      assertWithinRange(vscodeBox.y + vscodeBox.height, calculatorBox.y, 36);
      assertWithinRange(vscodeBox.x, calculatorBox.x, 24);

      await page.addStyleTag({
        content: '#window-area .main-window .flex-1, #window-area .main-window iframe { visibility: hidden !important; }',
      });

      await expect(page.locator('#window-area')).toHaveScreenshot(`window-layout-${viewport.name}.png`, {
        animations: 'disabled',
        mask: [page.locator('#window-area .main-window .flex-1'), page.locator('#window-area .main-window iframe')],
        threshold: 0.05,
      });
    });

    test(`maximizes, restores, minimizes, and exercises overlays`, async ({ page }) => {
      await prepareDesktop(page);
      const terminal = await openAppWindow(page, APP_WINDOWS.terminal);
      const vscode = await openAppWindow(page, APP_WINDOWS.vscode);

      const maximizeButton = terminal.getByRole('button', { name: 'Window maximize' });
      await maximizeButton.click();
      await expect(terminal).toHaveAttribute('data-window-state', 'maximized');

      const viewportSize = page.viewportSize();
      if (!viewportSize) {
        throw new Error('Viewport unavailable');
      }
      const maximizedBox = await terminal.boundingBox();
      if (!maximizedBox) {
        throw new Error('Failed to measure maximized window');
      }
      expect(maximizedBox.width).toBeGreaterThanOrEqual(viewportSize.width - 24);
      expect(maximizedBox.height).toBeGreaterThanOrEqual(Math.round(viewportSize.height * 0.85));

      const restoreButton = terminal.getByRole('button', { name: 'Window restore' });
      await restoreButton.click();
      await expect(terminal).toHaveAttribute('data-window-state', 'active');

      const minimizeButton = terminal.getByRole('button', { name: 'Window minimize' });
      await minimizeButton.click();
      await expect(terminal).toHaveAttribute('data-window-state', 'minimized');

      const taskbarButton = page.locator('[data-context="taskbar"][data-app-id="terminal"]');
      await expect(taskbarButton).toBeVisible();
      await taskbarButton.click();
      await expect(terminal).toHaveAttribute('data-window-state', 'active');

      await page.keyboard.press('Control+Escape');
      const launcherOverlay = page.locator('[aria-labelledby="all-apps-overlay-title"]');
      await expect(launcherOverlay).toBeVisible();
      await expect(launcherOverlay).toHaveScreenshot(`launcher-${viewport.name}.png`, {
        animations: 'disabled',
        mask: [launcherOverlay.locator('input[type="search"]')],
        threshold: 0.1,
      });
      await page.keyboard.press('Escape');
      await expect(launcherOverlay).toBeHidden();

      await page.keyboard.down('Alt');
      await page.keyboard.press('Tab');
      const switcherOverlay = page.getByText('Switch windows');
      await expect(switcherOverlay).toBeVisible();
      await expect(switcherOverlay).toHaveScreenshot(`switcher-${viewport.name}.png`, {
        animations: 'disabled',
        threshold: 0.15,
      });
      await page.keyboard.up('Alt');
      await expect(switcherOverlay).toBeHidden();

      await page.keyboard.press('Control+Escape');
      await expect(launcherOverlay).toBeVisible();
      await launcherOverlay.press('Escape');

      await terminal.getByRole('button', { name: 'Window minimize' }).click();
      await vscode.getByRole('button', { name: 'Window minimize' }).click();
      await expect(terminal).toHaveAttribute('data-window-state', 'minimized');
      await expect(vscode).toHaveAttribute('data-window-state', 'minimized');
    });
  });
}
