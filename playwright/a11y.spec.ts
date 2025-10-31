import { test } from '@playwright/test';
import { runAxeAudit } from './support/a11y';
import {
  gotoDesktop,
  openDesktopWindow,
  seedDesktopPreferences,
} from './support/desktop';

const primaryRoutes: { path: string; label: string; waitFor?: string; settleMs?: number }[] = [
  { path: '/', label: 'Desktop shell', waitFor: '#window-area', settleMs: 500 },
  { path: '/apps', label: 'Applications directory', settleMs: 500 },
  { path: '/profile', label: 'Profile overview', settleMs: 300 },
  { path: '/security-education', label: 'Security education hub', settleMs: 300 },
  { path: '/notes', label: 'Notes workspace', settleMs: 300 },
];

const desktopWindows: { id: string; title: string }[] = [
  { id: 'terminal', title: 'Terminal' },
  { id: 'settings', title: 'Settings' },
  { id: 'firefox', title: 'Firefox' },
];

test.describe('Primary route accessibility', () => {
  for (const route of primaryRoutes) {
    test(`audits ${route.label}`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      if (route.path === '/') {
        await seedDesktopPreferences(page);
        await gotoDesktop(page);
      } else {
        await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        if (route.waitFor) {
          await page.locator(route.waitFor).first().waitFor({ state: 'attached', timeout: 30_000 });
        }
      }

      if (route.settleMs) {
        await page.waitForTimeout(route.settleMs);
      }

      await runAxeAudit(page, testInfo, {
        label: route.label,
        include: route.path === '/' ? ['#window-area'] : undefined,
      });
    });
  }
});

test.describe('Desktop window accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await seedDesktopPreferences(page);
    await gotoDesktop(page);
  });

  for (const { id, title } of desktopWindows) {
    test(`audits ${title} window`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await openDesktopWindow(page, id, title);
      await runAxeAudit(page, testInfo, {
        label: `${title} window`,
        include: [`#${id}`],
      });
    });
  }
});

