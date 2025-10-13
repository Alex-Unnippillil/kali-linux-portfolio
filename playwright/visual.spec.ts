import { expect, Page, TestInfo, test } from '@playwright/test';

const FIXED_TIMESTAMP = Date.UTC(2024, 0, 8, 12, 0, 0);
const DESKTOP_PROJECTS = new Set(['desktop-default', 'desktop-neon']);
const MOBILE_PROJECTS = new Set(['mobile-pixel']);
const PROJECT_THEME: Record<string, string> = {
  'desktop-default': 'default',
  'desktop-neon': 'neon',
  'mobile-pixel': 'dark',
};

type SnapshotSetupOptions = {
  locked?: boolean;
  theme?: string;
};

async function prepareSnapshotEnvironment(
  page: Page,
  testInfo: TestInfo,
  options: SnapshotSetupOptions = {},
) {
  const { locked = false } = options;
  const theme = options.theme ?? PROJECT_THEME[testInfo.project.name] ?? 'default';

  await page.addInitScript(
    ({ fixedTime, shouldLock, snapshotTheme }) => {
      const OriginalDate = Date;
      class FixedDate extends OriginalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(fixedTime);
          } else if (args.length === 1) {
            super(args[0]);
          } else if (args.length === 2) {
            super(args[0], args[1]);
          } else if (args.length === 3) {
            super(args[0], args[1], args[2]);
          } else if (args.length === 4) {
            super(args[0], args[1], args[2], args[3]);
          } else if (args.length === 5) {
            super(args[0], args[1], args[2], args[3], args[4]);
          } else if (args.length === 6) {
            super(args[0], args[1], args[2], args[3], args[4], args[5]);
          } else {
            super(
              args[0],
              args[1],
              args[2],
              args[3],
              args[4],
              args[5],
              args[6],
            );
          }
        }
        static now() {
          return fixedTime;
        }
      }
      Object.setPrototypeOf(FixedDate, OriginalDate);
      window.Date = FixedDate as unknown as DateConstructor;

      if (window.performance && typeof window.performance.now === 'function') {
        const firstNow = window.performance.now();
        window.performance.now = () => firstNow;
      }

      try {
        const storage = window.localStorage;
        storage?.setItem('booting_screen', 'false');
        storage?.setItem('screen-locked', shouldLock ? 'true' : 'false');
        storage?.setItem('app:theme', snapshotTheme);
        storage?.setItem('lab-mode:auto', 'false');
        storage?.setItem('desktop_icon_size_preset', 'regular');
        storage?.setItem('desktop_folder_contents', '{}');
        storage?.setItem('desktop_window_sizes', '{}');
        storage?.setItem('new_folders', '[]');
        storage?.setItem('booted-once', 'true');
      } catch (error) {
        console.warn('Snapshot setup could not access localStorage', error);
      }

      const applyAnimationOverrides = () => {
        const style = document.createElement('style');
        style.setAttribute('data-testid', 'snapshot-animation-overrides');
        style.textContent = `
          *, *::before, *::after {
            transition-duration: 0.001ms !important;
            transition-delay: 0ms !important;
            animation-duration: 0.001ms !important;
            animation-delay: 0ms !important;
            animation-iteration-count: 1 !important;
          }
        `;
        document.head.appendChild(style);
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyAnimationOverrides, {
          once: true,
        });
      } else {
        applyAnimationOverrides();
      }
    },
    {
      fixedTime: FIXED_TIMESTAMP,
      shouldLock: locked,
      snapshotTheme: theme,
    },
  );
}

async function settleUi(page: Page) {
  await page.waitForTimeout(200);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function gotoAndStabilize(
  page: Page,
  path: string,
  waitFor?: () => Promise<unknown>,
) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
  } catch {
    // Some widgets keep polling; ignore network idle timeout.
  }
  if (waitFor) {
    await waitFor();
  }
  await settleUi(page);
}

test.describe('Desktop shell snapshots', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!DESKTOP_PROJECTS.has(testInfo.project.name)) {
      test.skip();
    }
    await prepareSnapshotEnvironment(page, testInfo);
  });

  test('unlocked desktop layout', async ({ page }) => {
    await gotoAndStabilize(page, '/');
    await page.waitForSelector('.desktop-shell', { state: 'visible' });
    await page.waitForSelector('#ubuntu-lock-screen[aria-hidden="true"]', {
      state: 'attached',
    });
    await expect(page).toHaveScreenshot('desktop-home.png', { fullPage: true });
  });

  test('terminal window open', async ({ page }) => {
    await gotoAndStabilize(page, '/');
    await page.waitForSelector('.desktop-shell', { state: 'visible' });
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('taskbar-command', {
          detail: { appId: 'terminal', action: 'open' },
        }),
      );
    });
    await page.getByRole('dialog', { name: 'Terminal' }).waitFor({
      state: 'visible',
    });
    await settleUi(page);
    await expect(page).toHaveScreenshot('desktop-terminal.png', {
      fullPage: true,
    });
  });

  test('applications launcher overlay', async ({ page }) => {
    await gotoAndStabilize(page, '/');
    await page.waitForSelector('.desktop-shell', { state: 'visible' });
    await page.getByRole('button', { name: 'Applications' }).click();
    await page.getByTestId('whisker-menu-dropdown').waitFor({
      state: 'visible',
    });
    await settleUi(page);
    await expect(page).toHaveScreenshot('desktop-launcher.png', {
      fullPage: true,
    });
  });

  test('lock screen state', async ({ page }, testInfo) => {
    await prepareSnapshotEnvironment(page, testInfo, { locked: true });
    await gotoAndStabilize(page, '/');
    await page.waitForSelector('#ubuntu-lock-screen[aria-hidden="false"]', {
      state: 'visible',
    });
    await expect(page).toHaveScreenshot('desktop-lock-screen.png', {
      fullPage: true,
    });
  });
});

test.describe('App catalog snapshots', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await prepareSnapshotEnvironment(page, testInfo);
  });

  test('app grid view', async ({ page }) => {
    await gotoAndStabilize(page, '/apps', async () => {
      await page.waitForSelector('#app-grid a[aria-label]', { state: 'visible' });
    });
    await expect(page).toHaveScreenshot('app-catalog.png', { fullPage: true });
  });

  test('contact app detail', async ({ page }) => {
    await gotoAndStabilize(page, '/apps/contact', async () => {
      await page.getByRole('heading', { name: 'Contact' }).waitFor({
        state: 'visible',
      });
    });
    await expect(page).toHaveScreenshot('contact-app.png', { fullPage: true });
  });
});

test.describe('Mobile layout snapshots', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!MOBILE_PROJECTS.has(testInfo.project.name)) {
      test.skip();
    }
    await prepareSnapshotEnvironment(page, testInfo);
  });

  test('mobile shell overview', async ({ page }) => {
    await gotoAndStabilize(page, '/');
    await page.waitForSelector('.desktop-shell', { state: 'visible' });
    await expect(page).toHaveScreenshot('mobile-desktop.png', {
      fullPage: true,
    });
  });
});
