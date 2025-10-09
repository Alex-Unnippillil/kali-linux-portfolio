import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function waitForWorkspaceSwitcher(page: Page) {
  const switcher = page.locator('nav[aria-label*="Workspace switcher"]');
  await switcher.waitFor({ state: 'visible' });
  await page.locator('nav[aria-label*="Workspace switcher"] button').first().waitFor();
  return switcher;
}

test.describe('workspace switcher interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForWorkspaceSwitcher(page);
  });

  test('highlights workspace button during window drag', async ({ page }) => {
    const switcher = await waitForWorkspaceSwitcher(page);
    const secondButton = switcher.locator('button').nth(1);
    await secondButton.waitFor();

    const box = await secondButton.boundingBox();
    if (!box) throw new Error('Failed to measure workspace button');

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('desktop-window-drag-start', {
          detail: { windowId: 'about' },
        }),
      );
    });

    await page.evaluate(({ x, y }) => {
      window.dispatchEvent(
        new CustomEvent('desktop-window-dragging', {
          detail: { windowId: 'about', clientX: x, clientY: y },
        }),
      );
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });

    await expect(secondButton).toHaveAttribute('data-drop-target', 'true');

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('desktop-window-drag-end', {
          detail: { windowId: 'about' },
        }),
      );
    });

    await expect(secondButton).not.toHaveAttribute('data-drop-target', 'true');
  });

  test('dispatches workspace move event when dropping window', async ({ page }) => {
    const detail = await page.evaluate(() => {
      return new Promise((resolve) => {
        const switcher = document.querySelector('nav[aria-label*="Workspace switcher"]');
        const buttons = switcher ? switcher.querySelectorAll('button') : null;
        const target = buttons && buttons[1];
        if (!target) {
          resolve(null);
          return;
        }
        const rect = target.getBoundingClientRect();
        const handler = (event) => {
          window.removeEventListener('workspace-move-window', handler);
          resolve(event.detail);
        };
        window.addEventListener('workspace-move-window', handler);
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        window.dispatchEvent(new CustomEvent('desktop-window-drag-start', { detail: { windowId: 'about' } }));
        window.dispatchEvent(
          new CustomEvent('desktop-window-dragging', {
            detail: { windowId: 'about', clientX: x, clientY: y },
          }),
        );
        window.dispatchEvent(new CustomEvent('desktop-window-drag-end', { detail: { windowId: 'about' } }));
      });
    });

    expect(detail).not.toBeNull();
    expect(detail).toMatchObject({ windowId: 'about', targetWorkspaceId: 1 });
  });

  test('taskbar context menu lists move to workspace actions', async ({ page }) => {
    const taskbarButton = page.locator('[data-context="taskbar"]');
    await taskbarButton.first().waitFor();
    await taskbarButton.first().focus();
    await page.keyboard.press('Shift+F10');

    const menu = page.locator('#taskbar-menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('button', { hasText: 'Workspace 2' }).first()).toBeVisible();

    await page.keyboard.press('Escape');
  });
});
