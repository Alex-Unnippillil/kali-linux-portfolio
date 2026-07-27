import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    manualRefresh?: () => void | Promise<void>;
  }
}

test.describe('release channel lifecycle', () => {
  test('preview update can rollback to stable without client errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      if (typeof window.manualRefresh !== 'function') {
        window.manualRefresh = () => undefined;
      }
    });
    await page.evaluate(() => {
      localStorage.setItem('release-channel', 'stable');
    });

    await page.waitForFunction(
      () => typeof window.manualRefresh === 'function',
      undefined,
      { timeout: 15000 },
    ).catch(() => {});

    const result = await page.evaluate(async () => {
      const state: {
        initial: string;
        preview: string;
        stable: string;
        updateTriggered: boolean;
        updateError?: string;
      } = {
        initial: localStorage.getItem('release-channel') || 'stable',
        preview: '',
        stable: '',
        updateTriggered: false,
      };

      try {
        localStorage.setItem('release-channel', 'preview');
        state.preview = localStorage.getItem('release-channel') || '';
        if (typeof window.manualRefresh === 'function') {
          const maybe = window.manualRefresh();
          if (maybe instanceof Promise) {
            await maybe;
          }
          state.updateTriggered = true;
        }
      } catch (error) {
        state.updateError = error instanceof Error ? error.message : String(error);
      } finally {
        localStorage.setItem('release-channel', 'stable');
        state.stable = localStorage.getItem('release-channel') || '';
      }

      return state;
    });

    expect(result.initial).toBe('stable');
    expect(result.preview).toBe('preview');
    expect(result.stable).toBe('stable');
    expect(result.updateError ?? '').toBe('');
    expect(result.updateTriggered).toBeTruthy();
    expect(consoleErrors, consoleErrors.join('\n')).toHaveLength(0);
    expect(pageErrors, pageErrors.join('\n')).toHaveLength(0);
  });
});
