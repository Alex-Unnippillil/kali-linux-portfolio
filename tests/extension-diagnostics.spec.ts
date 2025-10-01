import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __EXTENSION_DIAGNOSTICS__?: {
      getSnapshot: () => Array<{ id: string; enabled: boolean; messageCount: number }>;
      setEnabled: (id: string, enabled: boolean) => boolean;
      toggle: (id: string) => boolean;
    };
    __EXTENSION_MOCKS__?: {
      notifications?: {
        push: (input: { appId: string; title: string; timestamp?: number }) => string;
        clear?: (appId?: string) => void;
        enabled?: () => boolean;
      };
    };
  }
}

test.describe('Extension diagnostics overlay', () => {
  test('supports toggling extensions without breaking mocks', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(
      () =>
        typeof window !== 'undefined' &&
        Boolean(window.__EXTENSION_DIAGNOSTICS__?.getSnapshot()?.length),
    );

    await page.keyboard.press('Control+Shift+E');

    const dialog = page.getByRole('dialog', { name: /Extension diagnostics/i });
    await expect(dialog).toBeVisible();

    const notificationToggle = dialog.getByRole('switch', { name: /Notification Center/i });
    await expect(notificationToggle).toHaveAttribute('aria-checked', 'true');

    await notificationToggle.click();
    await expect(notificationToggle).toHaveAttribute('aria-checked', 'false');

    const stateAfterDisable = await page.evaluate(() => {
      const snapshot = window.__EXTENSION_DIAGNOSTICS__?.getSnapshot() ?? [];
      return snapshot.find((entry: any) => entry.id === 'notification-center');
    });
    expect(stateAfterDisable?.enabled).toBe(false);

    // Attempt to push a notification while disabled (should no-op)
    const messagesWhileDisabled = await page.evaluate(() => {
      window.__EXTENSION_MOCKS__?.notifications?.push({
        appId: 'diagnostic-test',
        title: 'Disabled test event',
        timestamp: Date.now(),
      });
      const snapshot = window.__EXTENSION_DIAGNOSTICS__?.getSnapshot() ?? [];
      return snapshot.find((entry: any) => entry.id === 'notification-center')?.messageCount ?? 0;
    });

    await notificationToggle.click();
    await expect(notificationToggle).toHaveAttribute('aria-checked', 'true');

    await page.evaluate(() => {
      window.__EXTENSION_MOCKS__?.notifications?.push({
        appId: 'diagnostic-test',
        title: 'Enabled test event',
        timestamp: Date.now(),
      });
    });

    await page.waitForFunction(
      (previous) => {
        const snapshot = window.__EXTENSION_DIAGNOSTICS__?.getSnapshot() ?? [];
        const entry = snapshot.find((item: any) => item.id === 'notification-center');
        return entry && entry.enabled && entry.messageCount > previous;
      },
      messagesWhileDisabled,
    );
  });
});
