import { test, expect } from '@playwright/test';
import { TASKBAR_PROGRESS_EVENT } from '../utils/taskbarEvents';

test.describe('Taskbar progress integration', () => {
  test('renders throttled progress ring updates', async ({ page }) => {
    const appId = 'terminal';

    await page.addInitScript(() => {
      window.localStorage.setItem('booting_screen', 'false');
      window.localStorage.setItem('screen-locked', 'false');
      window.localStorage.setItem('shut-down', 'false');
    });

    await page.goto('/', { timeout: 60000 });
    await page.waitForSelector('[data-context="desktop-area"]', { state: 'attached', timeout: 60000 });

    const dockButton = page.locator(`[data-context="app"][data-app-id="${appId}"]`);
    await expect(dockButton).toBeVisible({ timeout: 60000 });
    await dockButton.click();

    const taskbarButton = page.locator(`[data-context="taskbar"][data-app-id="${appId}"]`);
    await expect(taskbarButton).toBeVisible({ timeout: 15000 });

    await page.evaluate(({ eventName, id }) => {
      const emit = (value: number, delay: number) => {
        window.setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent(eventName, {
              detail: {
                appId: id,
                badgeCount: Math.round(value / 25),
                progress: {
                  value,
                  label: `Download ${value}%`,
                  status: value >= 100 ? 'complete' : 'normal',
                },
              },
            }),
          );
        }, delay);
      };

      emit(0, 0);
      emit(25, 150);
      emit(50, 300);
      emit(75, 450);
      emit(100, 600);
    }, { eventName: TASKBAR_PROGRESS_EVENT, id: appId });

    const ring = taskbarButton.locator('.taskbar-progress-ring');
    await expect(ring).toBeVisible();

    await page.waitForFunction((id) => {
      const el = document.querySelector(`[data-context="taskbar"][data-app-id="${id}"] .taskbar-progress-ring`);
      if (!el) return false;
      const value = parseFloat(el.getAttribute('data-progress') || '0');
      return value >= 50;
    }, appId);

    await page.waitForFunction((id) => {
      const el = document.querySelector(`[data-context="taskbar"][data-app-id="${id}"] .taskbar-progress-ring`);
      if (!el) return false;
      const value = parseFloat(el.getAttribute('data-progress') || '0');
      return value >= 99;
    }, appId);

    await expect(ring).toHaveAttribute('data-state', 'complete');
    await expect(ring).toHaveAttribute('aria-label', /download 100%/i);

    const badge = taskbarButton.locator('.taskbar-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-count', /4/);
    await expect(badge).toHaveAttribute('aria-label', /pending updates/i);

    await page.evaluate(({ eventName, id }) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail: { appId: id, reset: true } }));
    }, { eventName: TASKBAR_PROGRESS_EVENT, id: appId });

    await page.waitForFunction(
      (id) => !document.querySelector(`[data-context="taskbar"][data-app-id="${id}"] .taskbar-progress-ring`),
      appId,
    );
    await page.waitForFunction(
      (id) => !document.querySelector(`[data-context="taskbar"][data-app-id="${id}"] .taskbar-badge`),
      appId,
    );

    await expect(ring).toHaveCount(0);
    await expect(badge).toHaveCount(0);
  });
});
